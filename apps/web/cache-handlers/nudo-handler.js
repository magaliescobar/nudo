// @ts-check
// Cache handler de `'use cache'` (R20, ADR 006): L1 en memoria + L2 en Redis compartido.
// - Claves: `nudo:{env}:{deploymentId}:uc:{cacheKey}` → un deploy nuevo no lee entradas viejas.
// - Tags: hash `nudo:{env}:tags` con timestamps { stale, expired } por tag; log en `nudo:{env}:tag-log`.
// - L1 entre instancias: pub/sub en `nudo:{env}:invalidate` si CACHE_L1_PUBSUB != "false";
//   si no (Vercel), `refreshTags()` relee el hash en cada request.
// - Anti-stampede: ante un miss solo quien toma el lock regenera; el resto espera la entrada en L2.
// - Redis caído: timeouts cortos + breaker; el handler degrada a L1 solamente, nunca lanza.
// CommonJS a propósito: Next lo carga con require.resolve desde next.config.
const { createHash, randomUUID } = require("node:crypto");
const os = require("node:os");
const { createClient } = require("redis");

const env = process.env.NUDO_ENV ?? process.env.NODE_ENV ?? "development";
const deploymentId = process.env.NEXT_DEPLOYMENT_ID ?? "local";
const instanceId = process.env.INSTANCE_ID ?? os.hostname();
const ns = `nudo:${env}`;
const keys = {
  entry: (/** @type {string} */ k) => `${ns}:${deploymentId}:uc:${k}`,
  lock: (/** @type {string} */ k) => `${ns}:${deploymentId}:uc-lock:${k}`,
  tags: `${ns}:tags`,
  tagLog: `${ns}:tag-log`,
  channel: `${ns}:invalidate`,
};
const pubsubEnabled = process.env.CACHE_L1_PUBSUB !== "false";

const OP_TIMEOUT_MS = 300;
const MAX_TTL_S = 7 * 24 * 60 * 60;
const L1_MAX_BYTES = Number(process.env.CACHE_L1_MAX_BYTES ?? 50 * 1024 * 1024);
const LOCK_TTL_MS = 10_000;
const LOCK_WAIT_MS = 3_000;
const LOCK_POLL_MS = 50;
const FULL_TAG_SYNC_MS = 30_000;
const TAG_LOG_SIZE = 200;
const releaseScript =
  "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";

/** @typedef {{ stale?: number, expired?: number }} TagState */
/** @typedef {{ value: Uint8Array, tags: string[], stale: number, timestamp: number, expire: number, revalidate: number }} StoredEntry */

/** @type {Map<string, StoredEntry>} */
const l1 = new Map();
let l1Bytes = 0;
/** @type {Map<string, TagState>} */
const tagState = new Map();
/** @type {Map<string, string>} lock tokens held by this instance */
const heldLocks = new Map();
/** @type {Map<string, Promise<StoredEntry | undefined>>} single-flight por instancia */
const waiting = new Map();
const stats = { hit: 0, miss: 0, stale: 0, l2: 0, degraded: 0 };
// Visible para /api/internal/stats (la app no puede importar este módulo: lo carga Next aparte).
/** @type {Record<symbol, unknown>} */ (globalThis)[Symbol.for("nudo.cache.stats")] = stats;
let lastFullSync = 0;
const observerKey = Symbol.for("nudo.cache.observer");

/** Reporta hit/miss/stale al request actual (Server-Timing, R05) si la app instaló el observer. */
function observe(/** @type {"hit" | "miss" | "stale"} */ status) {
  stats[status]++;
  const observer = /** @type {Record<symbol, unknown>} */ (globalThis)[observerKey];
  if (typeof observer === "function") observer(status);
}

// ---------- Redis con timeout + breaker ----------
/** @type {ReturnType<typeof createClient> | null} */
let client = null;
let failures = 0;
let openedAt = 0;
let lastLog = 0;

function log(/** @type {string} */ msg, /** @type {unknown} */ error) {
  const now = Date.now();
  if (now - lastLog < 10_000) return;
  lastLog = now;
  console.warn(
    JSON.stringify({
      level: "warn",
      scope: "cache-handler",
      instance: instanceId,
      msg,
      error: error instanceof Error ? error.message : String(error),
    }),
  );
}

function getClient() {
  if (client || !process.env.REDIS_URL) return client;
  client = createClient({
    url: process.env.REDIS_URL,
    disableOfflineQueue: true,
    commandOptions: { timeout: OP_TIMEOUT_MS },
    socket: { connectTimeout: 1_000, reconnectStrategy: (n) => Math.min(100 * 2 ** n, 5_000) },
  });
  client.on("error", (e) => log("redis error", e));
  client.connect().catch((e) => log("redis connect", e));
  if (pubsubEnabled) {
    const subscriber = client.duplicate();
    subscriber.on("error", (e) => log("redis subscriber", e));
    subscriber
      .connect()
      .then(() =>
        subscriber.subscribe(keys.channel, (message) => {
          try {
            const { tags } = JSON.parse(message);
            for (const [tag, state] of Object.entries(tags)) tagState.set(tag, state);
          } catch (e) {
            log("pubsub message", e);
          }
        }),
      )
      .catch((e) => log("redis subscribe", e));
  }
  return client;
}

/** Recién arrancada la instancia el socket puede estar conectando: esperar hasta el timeout. */
function waitUntilReady(/** @type {NonNullable<typeof client>} */ c) {
  if (!c.isOpen) return Promise.resolve(false);
  // Un error de conexión (Redis caído) corta la espera: el modo degradado debe ser inmediato.
  return new Promise((resolve) => {
    const done = (/** @type {boolean} */ ready) => {
      clearTimeout(timer);
      c.off("ready", onReady);
      c.off("error", onError);
      resolve(ready);
    };
    const onReady = () => done(true);
    const onError = () => done(false);
    const timer = setTimeout(() => done(false), OP_TIMEOUT_MS);
    c.once("ready", onReady);
    c.once("error", onError);
  });
}

/**
 * @template T
 * @param {(c: NonNullable<typeof client>) => Promise<T>} fn
 * @returns {Promise<{ ok: true, value: T } | { ok: false }>}
 */
async function redis(fn) {
  const c = getClient();
  if (!c) return { ok: false };
  if (openedAt && Date.now() - openedAt < 5_000) return { ok: false };
  if (!c.isReady && !(await waitUntilReady(c))) {
    stats.degraded++;
    return { ok: false };
  }
  /** @type {NodeJS.Timeout | undefined} */
  let timer;
  try {
    const value = await Promise.race([
      fn(c),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), OP_TIMEOUT_MS);
      }),
    ]);
    failures = 0;
    openedAt = 0;
    return { ok: true, value: /** @type {T} */ (value) };
  } catch (e) {
    stats.degraded++;
    if (++failures >= 3) openedAt = Date.now();
    log("redis op failed", e);
    return { ok: false };
  } finally {
    clearTimeout(timer);
  }
}

/** Eventos poco frecuentes (regeneración, espera agotada): una línea JSON, clave hasheada. */
function event(/** @type {string} */ msg, /** @type {string} */ cacheKey, extra = {}) {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      level: "info",
      scope: "cache-handler",
      instance: instanceId,
      msg,
      key: createHash("sha1").update(cacheKey).digest("hex").slice(0, 12),
      ...extra,
    }),
  );
}

// ---------- L1 ----------
function l1Get(/** @type {string} */ key) {
  const entry = l1.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.timestamp + entry.expire * 1000) {
    l1Delete(key);
    return undefined;
  }
  l1.delete(key);
  l1.set(key, entry); // LRU: al final
  return entry;
}

function l1Set(/** @type {string} */ key, /** @type {StoredEntry} */ entry) {
  l1Delete(key);
  l1.set(key, entry);
  l1Bytes += entry.value.byteLength;
  for (const [oldest, old] of l1) {
    if (l1Bytes <= L1_MAX_BYTES) break;
    l1.delete(oldest);
    l1Bytes -= old.value.byteLength;
  }
}

function l1Delete(/** @type {string} */ key) {
  const old = l1.get(key);
  if (!old) return;
  l1.delete(key);
  l1Bytes -= old.value.byteLength;
}

// ---------- serialización ----------
function encode(/** @type {StoredEntry} */ entry) {
  return JSON.stringify({ ...entry, value: Buffer.from(entry.value).toString("base64") });
}

/** @returns {StoredEntry} */
function decode(/** @type {string} */ raw) {
  const data = JSON.parse(raw);
  return { ...data, value: new Uint8Array(Buffer.from(data.value, "base64")) };
}

function toCacheEntry(/** @type {StoredEntry} */ entry, revalidate = entry.revalidate) {
  const bytes = entry.value;
  return {
    ...entry,
    revalidate,
    value: new ReadableStream({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      },
    }),
  };
}

// ---------- tags ----------
/** @returns {"fresh" | "stale" | "expired"} */
function tagStatus(/** @type {string[]} */ tags, /** @type {number} */ timestamp) {
  const now = Date.now();
  let status = /** @type {"fresh" | "stale"} */ ("fresh");
  for (const tag of tags) {
    const state = tagState.get(tag);
    if (!state) continue;
    if (state.expired !== undefined && state.expired > timestamp && state.expired <= now) {
      return "expired";
    }
    if (state.stale !== undefined && state.stale > timestamp) status = "stale";
  }
  return status;
}

async function syncTags() {
  const result = await redis((c) => c.hGetAll(keys.tags));
  if (!result.ok) return;
  for (const [tag, raw] of Object.entries(result.value)) tagState.set(tag, JSON.parse(raw));
  lastFullSync = Date.now();
}

// ---------- anti-stampede ----------
async function tryLock(/** @type {string} */ cacheKey) {
  const token = randomUUID();
  const result = await redis((c) =>
    c.set(keys.lock(cacheKey), token, {
      condition: "NX",
      expiration: { type: "PX", value: LOCK_TTL_MS },
    }),
  );
  // Redis caído ⇒ sin coordinación posible: regenera esta instancia (degradado).
  if (!result.ok) {
    event("cache.regenerate", cacheKey, { lock: "degraded" });
    return true;
  }
  if (result.value !== "OK") return false;
  heldLocks.set(cacheKey, token);
  return true;
}

async function releaseLock(/** @type {string} */ cacheKey) {
  const token = heldLocks.get(cacheKey);
  if (!token) return;
  heldLocks.delete(cacheKey);
  await redis((c) => c.eval(releaseScript, { keys: [keys.lock(cacheKey)], arguments: [token] }));
}

/** Espera a que otro proceso (o instancia) publique la entrada en L2. */
async function waitForEntry(/** @type {string} */ cacheKey, /** @type {number} */ after) {
  const deadline = Date.now() + LOCK_WAIT_MS;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, LOCK_POLL_MS));
    const local = l1Get(cacheKey);
    if (local && local.timestamp > after) return local;
    const result = await redis((c) => c.get(keys.entry(cacheKey)));
    if (!result.ok) return undefined;
    if (result.value) {
      const entry = decode(result.value);
      if (entry.timestamp > after) return entry;
    }
  }
  return undefined;
}

/** @returns {Promise<StoredEntry | undefined>} */
async function readThrough(/** @type {string} */ cacheKey) {
  const local = l1Get(cacheKey);
  if (local) return local;
  const result = await redis((c) => c.get(keys.entry(cacheKey)));
  if (!result.ok || !result.value) return undefined;
  const entry = decode(result.value);
  if (Date.now() > entry.timestamp + entry.expire * 1000) return undefined;
  stats.l2++;
  l1Set(cacheKey, entry);
  return entry;
}

/** Miss (o expirada por tag): quien gana el lock regenera; el resto espera el resultado. */
async function onMiss(/** @type {string} */ cacheKey, /** @type {number} */ after) {
  if (await tryLock(cacheKey)) {
    // Doble chequeo: otra instancia pudo regenerar y soltar el lock justo antes.
    const fresh = await redis((c) => c.get(keys.entry(cacheKey)));
    if (fresh.ok && fresh.value) {
      const entry = decode(fresh.value);
      if (entry.timestamp > after && tagStatus(entry.tags, entry.timestamp) === "fresh") {
        await releaseLock(cacheKey);
        return entry;
      }
    }
    event("cache.regenerate", cacheKey, { lock: "acquired" });
    return undefined;
  }
  let pending = waiting.get(cacheKey);
  if (!pending) {
    pending = waitForEntry(cacheKey, after).finally(() => waiting.delete(cacheKey));
    waiting.set(cacheKey, pending);
  }
  const entry = await pending;
  if (entry) l1Set(cacheKey, entry);
  else event("cache.wait-timeout", cacheKey, { waitedMs: LOCK_WAIT_MS });
  return entry;
}

/** @type {import("next/cache").CacheHandler & { __internal: object }} */
const handler = {
  async get(cacheKey, softTags) {
    let entry = await readThrough(cacheKey);
    let after = 0;
    if (entry) {
      const status = tagStatus([...entry.tags, ...softTags], entry.timestamp);
      if (status === "stale") {
        observe("stale");
        return toCacheEntry(entry, -1);
      }
      if (status === "fresh") {
        observe("hit");
        return toCacheEntry(entry);
      }
      after = entry.timestamp;
      l1Delete(cacheKey);
    }
    entry = await onMiss(cacheKey, after);
    if (entry && tagStatus([...entry.tags, ...softTags], entry.timestamp) === "fresh") {
      observe("hit");
      return toCacheEntry(entry);
    }
    observe("miss");
    return undefined;
  },

  async set(cacheKey, pendingEntry) {
    try {
      const entry = await pendingEntry;
      // Si el stream falla a mitad de render, se descarta: un valor incompleto da una página incompleta.
      const value = new Uint8Array(await new Response(entry.value).arrayBuffer());
      /** @type {StoredEntry} */
      const stored = {
        value,
        tags: entry.tags,
        stale: entry.stale,
        timestamp: entry.timestamp,
        expire: entry.expire,
        revalidate: entry.revalidate,
      };
      l1Set(cacheKey, stored);
      const ttl = Math.max(1, Math.min(Math.ceil(entry.expire), MAX_TTL_S));
      await redis((c) =>
        c.set(keys.entry(cacheKey), encode(stored), { expiration: { type: "EX", value: ttl } }),
      );
    } catch (e) {
      log("discarding entry", e);
    } finally {
      await releaseLock(cacheKey);
    }
  },

  async refreshTags() {
    const subscribed = pubsubEnabled && getClient()?.isReady;
    if (subscribed && Date.now() - lastFullSync < FULL_TAG_SYNC_MS) return;
    await syncTags();
  },

  async getExpiration(tags) {
    const now = Date.now();
    let max = 0;
    for (const tag of tags) {
      const expired = tagState.get(tag)?.expired;
      if (expired !== undefined && expired <= now && expired > max) max = expired;
    }
    return max;
  },

  async updateTags(tags, durations) {
    const now = Date.now();
    /** @type {Record<string, TagState>} */
    const changed = {};
    for (const tag of tags) {
      /** @type {TagState} */
      const state = durations
        ? {
            stale: now,
            ...(durations.expire !== undefined ? { expired: now + durations.expire * 1000 } : {}),
          }
        : { expired: now };
      tagState.set(tag, state);
      changed[tag] = state;
    }
    await redis((c) => {
      const multi = c.multi();
      for (const [tag, state] of Object.entries(changed)) {
        multi.hSet(keys.tags, tag, JSON.stringify(state));
        multi.lPush(
          keys.tagLog,
          JSON.stringify({
            tag,
            kind: !durations || durations.expire === 0 ? "expire" : "stale",
            at: now,
            instance: instanceId,
          }),
        );
      }
      multi.lTrim(keys.tagLog, 0, TAG_LOG_SIZE - 1);
      multi.publish(keys.channel, JSON.stringify({ tags: changed, instance: instanceId }));
      return multi.exec();
    });
  },

  __internal: { l1, tagState, stats, keys, instanceId, getClient },
};

module.exports = handler;
