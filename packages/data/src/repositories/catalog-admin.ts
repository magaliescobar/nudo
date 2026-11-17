// Mutaciones de catálogo para la herramienta interna (§3.4, ADR 017). Sin backoffice: las usan
// los scripts `catalog:*`, que después invalidan exactamente los tags de `tagsForMutation`.
import type { ProductStatus } from "@nudo/commerce/catalog";
import type { Locale } from "@nudo/i18n/config";
import { type Db, ObjectId } from "mongodb";
import { collections, type ProductDoc } from "../mongo/collections";

export type ProductMutationResult = { productId: string; categoryIds: string[] };

const productStatuses: readonly ProductStatus[] = ["draft", "active", "discontinued"];

export function isProductStatus(value: string): value is ProductStatus {
  return (productStatuses as readonly string[]).includes(value);
}

export function createCatalogAdminRepository(db: Db) {
  const { products, inventory, redirects } = collections(db);

  async function load(productId: string) {
    if (!ObjectId.isValid(productId)) return null;
    return products.findOne({ _id: new ObjectId(productId) });
  }

  const resultOf = (doc: ProductDoc): ProductMutationResult => ({
    productId: doc._id.toHexString(),
    categoryIds: doc.categoryIds.map((id) => id.toHexString()),
  });

  return {
    /** Mismo precio para todos los SKUs del producto; quita `compareAtPrice` si deja de ser oferta. */
    async setPrice(productId: string, amountInCents: number) {
      if (!Number.isInteger(amountInCents) || amountInCents <= 0) {
        throw new RangeError(`Precio inválido: ${amountInCents}`);
      }
      const doc = await load(productId);
      if (!doc) return null;
      const variants = doc.variants.map((variant) => ({
        ...variant,
        skus: variant.skus.map(({ compareAtPrice, ...sku }) => ({
          ...sku,
          price: { ...sku.price, amountInCents },
          ...(compareAtPrice && compareAtPrice.amountInCents > amountInCents
            ? { compareAtPrice }
            : {}),
        })),
      }));
      await products.updateOne(
        { _id: doc._id },
        {
          $set: {
            variants,
            "search.minPrice": amountInCents,
            "search.maxPrice": amountInCents,
            updatedAt: new Date(),
          },
        },
      );
      return resultOf(doc);
    },

    async rename(productId: string, locale: Locale, name: string) {
      const doc = await load(productId);
      if (!doc) return null;
      await products.updateOne(
        { _id: doc._id },
        { $set: { [`name.${locale}`]: name, updatedAt: new Date() } },
      );
      return resultOf(doc);
    },

    async setStatus(productId: string, status: ProductStatus) {
      const doc = await load(productId);
      if (!doc) return null;
      await products.updateOne({ _id: doc._id }, { $set: { status, updatedAt: new Date() } });
      return resultOf(doc);
    },

    /** Cambia el slug y deja un 301 desde el anterior, sin cadenas de redirects. */
    async setSlug(productId: string, locale: Locale, slug: string) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new RangeError(`Slug inválido: ${slug}`);
      const doc = await load(productId);
      if (!doc) return null;
      const previous = doc.slug[locale];
      if (previous === slug) return resultOf(doc);
      const taken = await products.findOne({ [`slug.${locale}`]: slug, _id: { $ne: doc._id } });
      if (taken) throw new Error(`El slug "${slug}" ya existe en ${locale}`);

      const from = `/${locale}/p/${previous}`;
      const to = `/${locale}/p/${slug}`;
      await products.updateOne(
        { _id: doc._id },
        { $set: { [`slug.${locale}`]: slug, updatedAt: new Date() } },
      );
      await redirects.deleteOne({ from: to });
      await redirects.updateMany({ to: from }, { $set: { to } });
      await redirects.replaceOne({ from }, { from, to, status: 301 }, { upsert: true });
      return resultOf(doc);
    },

    /** Fija el disponible de un SKU y recalcula `search.inStock` del producto (ADR 009). */
    async setStock(sku: string, available: number) {
      if (!Number.isInteger(available) || available < 0) {
        throw new RangeError(`Stock inválido: ${available}`);
      }
      const updated = await inventory.updateOne(
        { sku },
        { $set: { available, updatedAt: new Date() } },
      );
      if (updated.matchedCount === 0) return null;
      const doc = await products.findOne({ "variants.skus.sku": sku });
      if (!doc) return { skus: [sku], inStock: available > 0 };
      const skus = doc.variants.flatMap((variant) => variant.skus.map((s) => s.sku));
      const inStock =
        (await inventory.countDocuments(
          { sku: { $in: skus }, $expr: { $gt: ["$available", "$reserved"] } },
          { limit: 1 },
        )) > 0;
      if (inStock !== doc.search.inStock) {
        await products.updateOne({ _id: doc._id }, { $set: { "search.inStock": inStock } });
      }
      return { skus: [sku], inStock };
    },
  };
}

export type CatalogAdminRepository = ReturnType<typeof createCatalogAdminRepository>;
