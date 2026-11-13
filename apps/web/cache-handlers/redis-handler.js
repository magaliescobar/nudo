const { createClient } = require("redis");

const client = createClient({ url: process.env.REDIS_URL });
client.connect();

module.exports = {
  async get(cacheKey, softTags) {
    try {
      const stored = await client.get(cacheKey);
      if (!stored) return undefined;
      const data = JSON.parse(stored);
      if (Date.now() > data.timestamp + data.revalidate * 1000) {
        return undefined;
      }
      return {
        value: new ReadableStream({
          start(controller) {
            controller.enqueue(Buffer.from(data.value, "base64"));
            controller.close();
          },
        }),
        tags: data.tags,
        stale: data.stale,
        timestamp: data.timestamp,
        expire: data.expire,
        revalidate: data.revalidate,
      };
    } catch (error) {
      console.error("Error getting cache from Redis:", error);
      return undefined;
    }
  },

  async set(cacheKey, pendingEntry) {
    const entry = await pendingEntry;
    const reader = entry.value.getReader();
    const chunks = [];
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const data = Buffer.concat(chunks.map((c) => Buffer.from(c)));
    await client.set(
      cacheKey,
      JSON.stringify({
        value: data.toString("base64"),
        tags: entry.tags,
        stale: entry.stale,
        timestamp: entry.timestamp,
        expire: entry.expire,
        revalidate: entry.revalidate,
      }),
      { EX: entry.expire },
    );
    console.log("Cache set in Redis:", cacheKey);
  },

  async refreshTags() {},
  async getExpiration(tags) {
    return 0;
  },
  async updateTags(tags, durations) {},
};
