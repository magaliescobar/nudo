import type { Dictionary } from "./es";

// Una clave faltante o sobrante respecto de `es` es error de compilación (R25).
const en = {
  meta: { siteName: "NUDO", tagline: "Urban clothing to move around the city" },
  nav: { shop: "Shop", cart: "Cart", help: "Help", skipToContent: "Skip to content" },
  locale: { label: "Language", es: "Español", en: "English" },
  catalog: {
    productCount: { one: "# product", other: "# products" },
    filters: "Filters",
    sort: "Sort",
  },
  cart: { title: "Cart", addToCart: "Add to cart", checkout: "Checkout" },
} as const satisfies Dictionary;

export default en;
