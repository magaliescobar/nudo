// Catálogo de colores de variante (R11 faceta de color / R13 swatches).
// El `id` coincide con `Variant.id` y con `search.colors` en Mongo (ADR 009).
import type { Localized } from "@nudo/i18n/config";

export type CatalogColor = {
  readonly id: string;
  readonly name: Localized<string>;
  readonly hex: string;
};

export const catalogColors: readonly CatalogColor[] = [
  { id: "negro", name: { es: "Negro", en: "Black" }, hex: "#17181C" },
  { id: "hueso", name: { es: "Hueso", en: "Bone" }, hex: "#E9E4D8" },
  { id: "cobalto", name: { es: "Cobalto", en: "Cobalt" }, hex: "#3550FF" },
  { id: "coral", name: { es: "Coral", en: "Coral" }, hex: "#FF4F6E" },
  { id: "oliva", name: { es: "Oliva", en: "Olive" }, hex: "#6B7042" },
  { id: "gris", name: { es: "Gris cemento", en: "Concrete grey" }, hex: "#9A9D97" },
];

const byId = new Map(catalogColors.map((color) => [color.id, color]));

export function colorById(id: string): CatalogColor | undefined {
  return byId.get(id);
}
