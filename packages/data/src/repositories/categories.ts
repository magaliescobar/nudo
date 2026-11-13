import type { Category } from "@nudo/commerce/catalog";
import type { Locale } from "@nudo/i18n/config";
import type { Db } from "mongodb";
import { collections, toCategory } from "../mongo/collections";

export function createCategoryRepository(db: Db) {
  const { categories } = collections(db);

  return {
    async all(): Promise<Category[]> {
      const docs = await categories.find().sort({ "path.length": 1 }).toArray();
      return docs.map(toCategory);
    },

    async findBySlug(locale: Locale, slug: string): Promise<Category | null> {
      const doc = await categories.findOne({ [`slug.${locale}`]: slug });
      return doc ? toCategory(doc) : null;
    },
  };
}

export type CategoryRepository = ReturnType<typeof createCategoryRepository>;
