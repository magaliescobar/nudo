// Seed reproducible del catálogo ES/EN (Fase 1).
//   pnpm db:seed
// Determinístico (PRNG con semilla fija + ObjectIds derivados de claves) e idempotente
// (upsert por _id/sku y borrado de lo que ya no forma parte del seed).
import { createHash } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import type { Variant } from "@nudo/commerce/catalog";
import { MongoClient, ObjectId } from "mongodb";
import sharp from "sharp";
import {
  type CategoryDoc,
  collections,
  type InventoryDoc,
  type ProductDoc,
  type RedirectDoc,
} from "../src/mongo/collections";
import { ensureIndexes, ensureSearchIndex } from "../src/mongo/indexes";

const root = path.resolve(import.meta.dirname, "../../..");
const envFile = path.join(root, ".env.local");
if (existsSync(envFile)) process.loadEnvFile(envFile);

const imageDir = path.join(root, "apps/web/public/catalog");
const PRODUCT_COUNT = 300;
const SEED = 20261113;

// ---------- utilidades determinísticas ----------
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = mulberry32(SEED);
const int = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));
const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)] as T;
const sample = <T>(items: readonly T[], count: number): T[] =>
  [...items].sort(() => random() - 0.5).slice(0, count);
const idFor = (key: string) =>
  new ObjectId(createHash("sha1").update(key).digest("hex").slice(0, 24));
const slugify = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// ---------- datos base ----------
type L = { es: string; en: string };

const colors: Record<string, { name: L; hex: string }> = {
  negro: { name: { es: "Negro", en: "Black" }, hex: "#17181C" },
  hueso: { name: { es: "Hueso", en: "Bone" }, hex: "#E9E4D8" },
  cobalto: { name: { es: "Cobalto", en: "Cobalt" }, hex: "#3550FF" },
  coral: { name: { es: "Coral", en: "Coral" }, hex: "#FF4F6E" },
  oliva: { name: { es: "Oliva", en: "Olive" }, hex: "#6B7042" },
  gris: { name: { es: "Gris cemento", en: "Concrete grey" }, hex: "#9A9D97" },
};
const colorIds = Object.keys(colors);

type Sub = { key: string; name: L; noun: L; sizes: string[]; price: [number, number] };
const tree: { key: string; name: L; subs: Sub[] }[] = [
  {
    key: "calzado",
    name: { es: "Calzado", en: "Footwear" },
    subs: [
      {
        key: "zapatillas",
        name: { es: "Zapatillas", en: "Sneakers" },
        noun: { es: "Zapatilla", en: "Sneaker" },
        sizes: ["38", "39", "40", "41", "42", "43", "44", "45"],
        price: [8900, 18900],
      },
      {
        key: "botas",
        name: { es: "Botas", en: "Boots" },
        noun: { es: "Bota", en: "Boot" },
        sizes: ["38", "39", "40", "41", "42", "43", "44"],
        price: [12900, 24900],
      },
    ],
  },
  {
    key: "tops",
    name: { es: "Tops", en: "Tops" },
    subs: [
      {
        key: "remeras",
        name: { es: "Remeras", en: "T-shirts" },
        noun: { es: "Remera", en: "Tee" },
        sizes: ["XS", "S", "M", "L", "XL", "XXL"],
        price: [2500, 5900],
      },
      {
        key: "buzos",
        name: { es: "Buzos", en: "Sweatshirts" },
        noun: { es: "Buzo", en: "Sweatshirt" },
        sizes: ["S", "M", "L", "XL"],
        price: [5900, 11900],
      },
      {
        key: "camperas",
        name: { es: "Camperas", en: "Jackets" },
        noun: { es: "Campera", en: "Jacket" },
        sizes: ["S", "M", "L", "XL"],
        price: [11900, 22900],
      },
    ],
  },
  {
    key: "pantalones",
    name: { es: "Pantalones", en: "Pants" },
    subs: [
      {
        key: "jeans",
        name: { es: "Jeans", en: "Jeans" },
        noun: { es: "Jean", en: "Jeans" },
        sizes: ["28", "30", "32", "34", "36"],
        price: [6900, 12900],
      },
      {
        key: "joggers",
        name: { es: "Joggers", en: "Joggers" },
        noun: { es: "Jogger", en: "Jogger" },
        sizes: ["S", "M", "L", "XL"],
        price: [4900, 8900],
      },
    ],
  },
  {
    key: "accesorios",
    name: { es: "Accesorios", en: "Accessories" },
    subs: [
      {
        key: "gorras",
        name: { es: "Gorras", en: "Caps" },
        noun: { es: "Gorra", en: "Cap" },
        sizes: ["S", "M", "L"],
        price: [1900, 3900],
      },
      {
        key: "mochilas",
        name: { es: "Mochilas", en: "Backpacks" },
        noun: { es: "Mochila", en: "Backpack" },
        sizes: ["12L", "18L", "24L"],
        price: [5900, 13900],
      },
    ],
  },
];

const lines: L[] = [
  { es: "Trama", en: "Weave" },
  { es: "Asfalto", en: "Asphalt" },
  { es: "Esquina", en: "Corner" },
  { es: "Andén", en: "Platform" },
  { es: "Terraza", en: "Rooftop" },
  { es: "Pasaje", en: "Passage" },
  { es: "Neón", en: "Neon" },
  { es: "Hormigón", en: "Concrete" },
  { es: "Ruta", en: "Route" },
  { es: "Bajo", en: "Underpass" },
  { es: "Puerto", en: "Harbor" },
  { es: "Distrito", en: "District" },
];
const fits: L[] = [
  { es: "Clásica", en: "Classic" },
  { es: "Ligera", en: "Light" },
  { es: "Pro", en: "Pro" },
  { es: "Oversize", en: "Oversize" },
  { es: "Técnica", en: "Tech" },
  { es: "Esencial", en: "Essential" },
];
const brands = ["NUDO", "NUDO Lab", "Cruce", "Vereda"];

// ---------- imágenes locales: una por subcategoría × color ----------
function silhouette(sub: string, fill: string): string {
  const shapes: Record<string, string> = {
    zapatillas: `<path d="M120 640 L180 520 Q260 470 360 520 L560 600 Q680 630 680 700 L680 740 L120 740 Z" fill="${fill}"/><rect x="120" y="740" width="560" height="40" rx="12" fill="#F6F7F4"/>`,
    botas: `<path d="M240 260 L420 260 L420 560 Q620 600 660 700 L660 780 L240 780 Z" fill="${fill}"/><rect x="240" y="780" width="420" height="40" rx="10" fill="#17203B"/>`,
    remeras: `<path d="M260 220 L340 190 Q400 240 460 190 L540 220 L660 340 L580 400 L540 360 L540 800 L260 800 L260 360 L220 400 L140 340 Z" fill="${fill}"/>`,
    buzos: `<path d="M250 210 L340 180 Q400 250 460 180 L550 210 L680 560 L600 590 L550 400 L550 820 L250 820 L250 400 L200 590 L120 560 Z" fill="${fill}"/><rect x="250" y="780" width="300" height="40" fill="#17203B" opacity="0.15"/>`,
    camperas: `<path d="M240 200 L350 170 L400 230 L450 170 L560 200 L690 600 L610 620 L560 420 L560 830 L240 830 L240 420 L190 620 L110 600 Z" fill="${fill}"/><rect x="396" y="230" width="8" height="600" fill="#17203B" opacity="0.4"/>`,
    jeans: `<path d="M280 180 L520 180 L560 860 L430 860 L400 380 L370 860 L240 860 Z" fill="${fill}"/>`,
    joggers: `<path d="M280 180 L520 180 L550 820 L440 840 L400 400 L360 840 L250 820 Z" fill="${fill}"/><rect x="250" y="800" width="110" height="40" fill="#17203B" opacity="0.2"/><rect x="440" y="800" width="110" height="40" fill="#17203B" opacity="0.2"/>`,
    gorras: `<path d="M200 560 Q200 330 400 330 Q600 330 600 560 Z" fill="${fill}"/><path d="M560 540 L720 600 L560 600 Z" fill="${fill}"/>`,
    mochilas: `<rect x="230" y="240" width="340" height="560" rx="60" fill="${fill}"/><rect x="290" y="480" width="220" height="200" rx="24" fill="#17203B" opacity="0.18"/>`,
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000"><rect width="800" height="1000" fill="#DDE0DA"/>${shapes[sub] ?? ""}</svg>`;
}

async function ensureImages(): Promise<number> {
  mkdirSync(imageDir, { recursive: true });
  let written = 0;
  for (const sub of tree.flatMap((c) => c.subs)) {
    for (const colorId of colorIds) {
      const file = path.join(imageDir, `${sub.key}-${colorId}.webp`);
      if (existsSync(file)) continue;
      const svg = Buffer.from(silhouette(sub.key, colors[colorId]!.hex));
      await sharp(svg).webp({ quality: 80 }).toFile(file);
      written++;
    }
  }
  return written;
}

// ---------- generación ----------
function buildCategories(): CategoryDoc[] {
  return tree.flatMap((category) => {
    const parentId = idFor(`category:${category.key}`);
    const parent: CategoryDoc = {
      _id: parentId,
      slug: { es: slugify(category.name.es), en: slugify(category.name.en) },
      name: category.name,
      path: [],
    };
    const children = category.subs.map((sub): CategoryDoc => ({
      _id: idFor(`category:${category.key}/${sub.key}`),
      slug: { es: slugify(sub.name.es), en: slugify(sub.name.en) },
      name: sub.name,
      parentId,
      path: [parentId],
    }));
    return [parent, ...children];
  });
}

function buildProducts(): { products: ProductDoc[]; inventory: InventoryDoc[] } {
  const subs = tree.flatMap((category) => category.subs.map((sub) => ({ category, sub })));
  const products: ProductDoc[] = [];
  const inventory: InventoryDoc[] = [];
  const updatedAt = new Date("2026-11-01T12:00:00Z");

  for (let index = 0; index < PRODUCT_COUNT; index++) {
    const { category, sub } = subs[index % subs.length]!;
    const line = pick(lines);
    const fit = pick(fits);
    const name = {
      es: `${sub.noun.es} ${line.es} ${fit.es}`,
      en: `${line.en} ${fit.en} ${sub.noun.en}`,
    };
    const number = String(index + 1).padStart(3, "0");
    const code = `${sub.key.slice(0, 3).toUpperCase()}${number}`;
    const basePrice = Math.round(int(sub.price[0], sub.price[1]) / 100) * 100 - 10;
    const onSale = random() < 0.15;
    const sizes = sample(sub.sizes, Math.max(3, Math.min(sub.sizes.length, int(3, 8)))).sort(
      (a, b) => sub.sizes.indexOf(a) - sub.sizes.indexOf(b),
    );

    const variants: Variant[] = sample(colorIds, int(2, 6)).map((colorId) => ({
      id: colorId,
      color: colors[colorId]!,
      images: [
        {
          src: `/catalog/${sub.key}-${colorId}.webp`,
          alt: {
            es: `${name.es} en color ${colors[colorId]!.name.es.toLowerCase()}`,
            en: `${name.en} in ${colors[colorId]!.name.en.toLowerCase()}`,
          },
          width: 800,
          height: 1000,
        },
      ],
      skus: sizes.map((size) => ({
        sku: `${code}-${colorId.slice(0, 3).toUpperCase()}-${size}`,
        size,
        price: {
          amountInCents: onSale ? Math.round(basePrice * 0.8) : basePrice,
          currency: "USD" as const,
        },
        ...(onSale
          ? { compareAtPrice: { amountInCents: basePrice, currency: "USD" as const } }
          : {}),
      })),
    }));

    let inStock = false;
    for (const variant of variants) {
      for (const { sku } of variant.skus) {
        const available = random() < 0.15 ? 0 : int(1, 25);
        inStock ||= available > 0;
        inventory.push({ sku, available, reserved: 0, updatedAt });
      }
    }
    const prices = variants.flatMap((v) => v.skus.map((s) => s.price.amountInCents));

    products.push({
      _id: idFor(`product:${code}`),
      slug: { es: `${slugify(name.es)}-${number}`, en: `${slugify(name.en)}-${number}` },
      name,
      description: {
        es: `${name.es}: diseño urbano de la línea ${line.es}, pensado para moverse todo el día por la ciudad.`,
        en: `${name.en}: urban design from the ${line.en} line, made to move around the city all day.`,
      },
      brand: pick(brands),
      categoryIds: [
        idFor(`category:${category.key}`),
        idFor(`category:${category.key}/${sub.key}`),
      ],
      // Casos borde: algunos discontinuados (ADR 013).
      status: index % 97 === 13 ? "discontinued" : "active",
      defaultVariantId: variants[0]!.id,
      variants,
      updatedAt,
      search: {
        colors: variants.map((v) => v.id),
        sizes: [...new Set(variants.flatMap((v) => v.skus.map((s) => s.size)))],
        minPrice: Math.min(...prices),
        maxPrice: Math.max(...prices),
        inStock,
      },
    });
  }

  // Un producto completo sin stock para probar el estado agotado.
  const soldOut = products[4]!;
  for (const item of inventory) {
    if (soldOut.variants.some((v) => v.skus.some((s) => s.sku === item.sku))) item.available = 0;
  }
  soldOut.search.inStock = false;

  return { products, inventory };
}

function buildRedirects(products: ProductDoc[]): RedirectDoc[] {
  // Simula un cambio de slug: la URL vieja apunta a la actual (R27).
  const renamed = products[0]!;
  return (["es", "en"] as const).map((locale) => ({
    from: `/${locale}/p/${renamed.slug[locale].replace(/-\d+$/, "")}-v1`,
    to: `/${locale}/p/${renamed.slug[locale]}`,
    status: 301,
  }));
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Falta MONGODB_URI (.env.local en la raíz del repo).");

  const images = await ensureImages();
  const categories = buildCategories();
  const { products, inventory } = buildProducts();
  const redirects = buildRedirects(products);

  const client = await new MongoClient(uri, { appName: "nudo-seed" }).connect();
  try {
    const db = client.db(process.env.MONGODB_DB ?? "nudo");
    const cols = collections(db);
    await ensureIndexes(db);

    await cols.categories.bulkWrite(
      categories.map((doc) => ({
        replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true },
      })),
    );
    await cols.categories.deleteMany({ _id: { $nin: categories.map((c) => c._id) } });

    await cols.products.bulkWrite(
      products.map((doc) => ({
        replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true },
      })),
    );
    await cols.products.deleteMany({ _id: { $nin: products.map((p) => p._id) } });

    await cols.inventory.bulkWrite(
      inventory.map((doc) => ({
        replaceOne: { filter: { sku: doc.sku }, replacement: doc, upsert: true },
      })),
    );
    await cols.inventory.deleteMany({ sku: { $nin: inventory.map((i) => i.sku) } });

    await cols.redirects.bulkWrite(
      redirects.map((doc) => ({
        replaceOne: { filter: { from: doc.from }, replacement: doc, upsert: true },
      })),
    );
    await cols.redirects.deleteMany({ from: { $nin: redirects.map((r) => r.from) } });

    const search = await ensureSearchIndex(db);
    const zero = inventory.filter((i) => i.available === 0).length;
    console.log(
      [
        `categorías: ${categories.length}`,
        `productos: ${products.length} (${products.filter((p) => p.status === "discontinued").length} discontinuados)`,
        `SKUs: ${inventory.length} (${zero} sin stock)`,
        `redirects: ${redirects.length}`,
        `imágenes nuevas: ${images}`,
        `Atlas Search: ${search}`,
      ].join(" · "),
    );
  } finally {
    await client.close();
  }
}

await main();
