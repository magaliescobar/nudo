import "server-only";
import type { Locale } from "./config";
import type { Dictionary } from "./dictionaries/es";

export type { Dictionary };

// Carga solo en servidor (R25): el diccionario completo nunca viaja al cliente.
// El archivo se resuelve por nombre de locale, así que agregar un idioma no toca este módulo.
export async function getDictionary(locale: Locale): Promise<Dictionary> {
  const mod = (await import(`./dictionaries/${locale}.ts`)) as { default: Dictionary };
  return mod.default;
}
