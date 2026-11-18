import "server-only";
import type { Category } from "@nudo/commerce/catalog";
import type { Locale } from "@nudo/i18n/config";
import { getCategories } from "./catalog";

export type ResolvedCategory = {
  readonly category: Category;
  /** Segmentos de slug canónicos (raíz → categoría), en el idioma actual. */
  readonly canonicalSegments: readonly string[];
};

/**
 * Resuelve `/[locale]/c/[...slug]`: el último segmento es la categoría y los anteriores
 * deben ser exactamente sus ancestros en orden. Devuelve null si no existe o el path no
 * es el canónico (el caller redirige).
 */
export async function resolveCategoryPath(
  locale: Locale,
  segments: readonly string[],
): Promise<ResolvedCategory | null> {
  if (segments.length === 0) return null;
  const categories = await getCategories();
  const leafSlug = segments[segments.length - 1]!;
  const leaf = categories.find((category) => category.slug[locale] === leafSlug);
  if (!leaf) return null;

  const byId = new Map(categories.map((category) => [category.id, category]));
  const ancestors = leaf.path.map((id) => byId.get(id)).filter((c) => c != null);
  if (ancestors.length !== segments.length - 1) return null;
  const matches = ancestors.every((ancestor, index) => ancestor.slug[locale] === segments[index]);
  if (!matches) return null;

  return {
    category: leaf,
    canonicalSegments: [...ancestors.map((c) => c.slug[locale]), leaf.slug[locale]],
  };
}

/** ids de la categoría + todos sus descendientes (los productos guardan padre + hoja). */
export function subtreeCategoryIds(category: Category, all: readonly Category[]): string[] {
  return all.filter((c) => c.id === category.id || c.path.includes(category.id)).map((c) => c.id);
}

/** Hijos directos de una categoría (para el facet jerárquico y el menú). */
export function childCategories(category: Category, all: readonly Category[]): Category[] {
  return all.filter((c) => c.parentId === category.id);
}

/** Categorías raíz (sin padre), ordenadas como en la colección. */
export function rootCategories(all: readonly Category[]): Category[] {
  return all.filter((c) => !c.parentId);
}

/** Breadcrumbs de una categoría: cada entrada lleva sus segmentos de slug canónicos. */
export function categoryBreadcrumbs(
  resolved: ResolvedCategory,
  all: readonly Category[],
): { category: Category; segments: readonly string[] }[] {
  const byId = new Map(all.map((c) => [c.id, c]));
  const crumbs = resolved.category.path
    .map((id) => byId.get(id))
    .filter((c) => c != null)
    .map((category, index) => ({
      category: category!,
      segments: [...resolved.canonicalSegments.slice(0, index + 1)],
    }));
  crumbs.push({
    category: resolved.category,
    segments: [...resolved.canonicalSegments],
  });
  return crumbs;
}
