import "server-only";
import { primitives, semantic, themes } from "@nudo/tokens/tokens";

// Paleta para ImageResponse/Satori (R33): no acepta CSS, solo el prop `style`,
// así que los hex salen directo del source de verdad de los tokens — nada
// hardcodeado. Usamos el tema oscuro como fondo (contraste en previews sociales).
type SemanticName = keyof typeof semantic;
type PrimitiveName = keyof typeof primitives;
type ThemeSemantic = keyof (typeof themes.dark)["semantic"];

const resolve = (name: PrimitiveName): string => primitives[name];

/** Semántico del tema claro → hex primitivo. */
export function color(name: SemanticName): string {
  return resolve(semantic[name] as PrimitiveName);
}

/** Semántico del tema oscuro → hex primitivo. */
export function darkColor(name: ThemeSemantic): string {
  return resolve(themes.dark.semantic[name] as PrimitiveName);
}
