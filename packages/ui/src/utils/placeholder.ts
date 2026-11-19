// Placeholder de imagen por color dominante (R36): el catálogo ya conoce el
// hex de cada variante — un rect sólido de 8×8 como blurDataURL evita el
// "salto" gris→foto mientras carga la imagen real.
export function blurDataURLFromHex(hex: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><rect width="8" height="8" fill="${hex}"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
