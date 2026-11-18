// Carrito de invitado (R15): dominio puro. El precio y el stock NUNCA vienen del cliente:
// se resuelven acá contra los productos y el inventario vigentes en cada lectura.
import type { Cart, Product } from "./catalog";
import { type Money, money } from "./money";

export type SkuInfo = {
  readonly sku: string;
  readonly productId: string;
  readonly productSlug: Product["slug"];
  readonly productName: Product["name"];
  readonly brand: string;
  readonly variantId: string;
  readonly colorName: Product["variants"][number]["color"]["name"];
  readonly colorHex: string;
  readonly image: Product["variants"][number]["images"][number] | undefined;
  readonly size: string;
  readonly price: Money;
  readonly compareAtPrice?: Money;
};

/** Índice sku → ficha, construido una vez por request a partir de los productos. */
export function indexSkus(products: readonly Product[]): ReadonlyMap<string, SkuInfo> {
  const index = new Map<string, SkuInfo>();
  for (const product of products) {
    for (const variant of product.variants) {
      for (const sku of variant.skus) {
        index.set(sku.sku, {
          sku: sku.sku,
          productId: product.id,
          productSlug: product.slug,
          productName: product.name,
          brand: product.brand,
          variantId: variant.id,
          colorName: variant.color.name,
          colorHex: variant.color.hex,
          image: variant.images[0],
          size: sku.size,
          price: sku.price,
          ...(sku.compareAtPrice ? { compareAtPrice: sku.compareAtPrice } : {}),
        });
      }
    }
  }
  return index;
}

export type PricedCartLine = {
  readonly sku: string;
  readonly qty: number;
  readonly info: SkuInfo;
  /** Precio unitario vigente en servidor. */
  readonly unitPrice: Money;
  /** `true` si el precio difiere del registrado al agregar la línea (aviso R15). */
  readonly priceChanged: boolean;
  /** Disponible actual (available − reserved). */
  readonly available: number;
  readonly lineTotal: Money;
  /** qty > disponible: al confirmar se limita o se rechaza la línea. */
  readonly exceedsStock: boolean;
};

export type CartNotice = "price-changed" | "out-of-stock" | "unavailable";

export type CartView = {
  readonly lines: readonly PricedCartLine[];
  readonly subtotal: Money;
  /** Líneas cuyo sku ya no existe en el catálogo (se descartan al confirmar). */
  readonly missingSkus: readonly string[];
  readonly notices: readonly CartNotice[];
  readonly itemCount: number;
};

const EMPTY_CART: CartView = {
  lines: [],
  subtotal: money(0),
  missingSkus: [],
  notices: [],
  itemCount: 0,
};

export function emptyCartView(): CartView {
  return EMPTY_CART;
}

/**
 * Resuelve un carrito contra el catálogo y el stock vigentes.
 * `stock` mapea sku → disponible (available − reserved). Las líneas con sku desconocido
 * o qty ≤ 0 se reportan en `missingSkus` para que la UI las descarte.
 */
export function resolveCart(
  cart: Cart,
  skus: ReadonlyMap<string, SkuInfo>,
  stock: Readonly<Record<string, number>>,
): CartView {
  const lines: PricedCartLine[] = [];
  const missingSkus: string[] = [];
  const notices = new Set<CartNotice>();
  let subtotal = 0;
  let itemCount = 0;

  for (const line of cart.lines) {
    const info = skus.get(line.sku);
    if (!info || line.qty <= 0) {
      missingSkus.push(line.sku);
      continue;
    }
    const available = Math.max(0, stock[line.sku] ?? 0);
    const exceedsStock = line.qty > available;
    if (available === 0) notices.add("out-of-stock");
    const priceChanged = line.priceAtAdd != null && line.priceAtAdd !== info.price.amountInCents;
    if (priceChanged) notices.add("price-changed");

    subtotal += info.price.amountInCents * line.qty;
    itemCount += line.qty;
    lines.push({
      sku: line.sku,
      qty: line.qty,
      info,
      unitPrice: info.price,
      priceChanged,
      available,
      lineTotal: money(info.price.amountInCents * line.qty),
      exceedsStock,
    });
  }

  return {
    lines,
    subtotal: money(subtotal),
    missingSkus,
    notices: [...notices],
    itemCount,
  };
}

/** Quita SKUs sin ficha y líneas con qty ≤ 0: sanea el carrito antes de guardarlo. */
export function sanitizeCart(cart: Cart, skus: ReadonlyMap<string, SkuInfo>): Cart {
  const lines = cart.lines.filter((line) => line.qty > 0 && skus.has(line.sku));
  return lines.length === cart.lines.length ? cart : { ...cart, lines };
}

export function setLineQty(cart: Cart, sku: string, qty: number, priceAtAdd?: number): Cart {
  const lines = cart.lines.filter((line) => line.sku !== sku);
  if (qty > 0) lines.push({ sku, qty, ...(priceAtAdd != null ? { priceAtAdd } : {}) });
  return { ...cart, lines, updatedAt: Date.now() };
}

export function addLine(cart: Cart, sku: string, qty: number, priceAtAdd?: number): Cart {
  const existing = cart.lines.find((line) => line.sku === sku);
  return setLineQty(cart, sku, (existing?.qty ?? 0) + qty, priceAtAdd ?? existing?.priceAtAdd);
}

export function removeLine(cart: Cart, sku: string): Cart {
  return { ...cart, lines: cart.lines.filter((line) => line.sku !== sku), updatedAt: Date.now() };
}
