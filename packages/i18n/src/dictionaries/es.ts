// Diccionario base: define la forma (`Dictionary`) que todo idioma debe cumplir (R25).
const es = {
  meta: { siteName: "NUDO", tagline: "Ropa urbana para moverse por la ciudad" },
  nav: { shop: "Tienda", cart: "Carrito", help: "Ayuda", skipToContent: "Saltar al contenido" },
  locale: { label: "Idioma", es: "Español", en: "English" },
  catalog: {
    productCount: { one: "# producto", other: "# productos" },
    filters: "Filtros",
    sort: "Ordenar",
  },
  cart: { title: "Carrito", addToCart: "Agregar al carrito", checkout: "Finalizar compra" },
} as const;

type Widen<T> = { readonly [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };

export type Dictionary = Widen<typeof es>;

export default es satisfies Dictionary;
