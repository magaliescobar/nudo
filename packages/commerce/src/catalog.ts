// Tipos de dominio del catálogo (§6 de la letra). Dominio puro: sin React, Next ni acceso a datos.
// Diferencia de contrato (ADR 004): los ids son strings en el dominio; ObjectId queda en la capa de datos.
import type { Locale, Localized } from "@nudo/i18n/config";
import type { Money } from "./money";

export type ProductStatus = "draft" | "active" | "discontinued";

export type ProductImage = {
  readonly src: string;
  readonly alt: Localized<string>;
  readonly width: number;
  readonly height: number;
};

export type Sku = {
  readonly sku: string;
  readonly size: string;
  readonly price: Money;
  readonly compareAtPrice?: Money;
};

/** Una variante = un color. */
export type Variant = {
  readonly id: string;
  readonly color: { readonly name: Localized<string>; readonly hex: string };
  readonly images: readonly ProductImage[];
  readonly skus: readonly Sku[];
};

export type Product = {
  readonly id: string;
  readonly slug: Localized<string>;
  readonly name: Localized<string>;
  readonly description: Localized<string>;
  readonly brand: string;
  readonly categoryIds: readonly string[];
  readonly status: ProductStatus;
  readonly defaultVariantId: string;
  readonly variants: readonly Variant[];
  readonly updatedAt: Date;
};

export type Category = {
  readonly id: string;
  readonly slug: Localized<string>;
  readonly name: Localized<string>;
  readonly parentId?: string;
  /** Ancestros, de la raíz al padre, para breadcrumbs. */
  readonly path: readonly string[];
};

export type Inventory = {
  readonly sku: string;
  readonly available: number;
  readonly reserved: number;
  readonly updatedAt: Date;
};

export type Redirect = {
  readonly from: string;
  readonly to: string;
  readonly status: 301 | 308;
};

export type Address = {
  readonly fullName: string;
  readonly line1: string;
  readonly line2?: string;
  readonly city: string;
  readonly region: string;
  readonly postalCode: string;
  readonly country: string;
  readonly phone?: string;
};

export type ShippingMethod = "standard" | "express";

export type OrderStatus = "placed" | "paid" | "failed";

export type OrderLine = {
  readonly sku: string;
  readonly name: string;
  readonly variant: string;
  readonly size: string;
  readonly qty: number;
  readonly unitPrice: Money;
};

/** Pedido de invitado: sin `userId` (ADR 004). */
export type Order = {
  readonly id: string;
  readonly number: string;
  readonly locale: Locale;
  readonly lines: readonly OrderLine[];
  readonly totals: { readonly subtotal: Money; readonly shipping: Money; readonly total: Money };
  readonly customer: { readonly email: string };
  readonly shipping: { readonly address: Address; readonly method: ShippingMethod };
  readonly status: OrderStatus;
  readonly idempotencyKey: string;
  readonly accessToken: string;
  readonly createdAt: Date;
};

/** Vive en Redis. Carrito de invitado: sin `userId` ni merge al loguear (ADR 004). */
export type Cart = {
  readonly id: string;
  readonly lines: readonly { readonly sku: string; readonly qty: number }[];
  readonly updatedAt: number;
};

export type CheckoutStep = "contact" | "shipping" | "delivery" | "payment" | "review";

/** Vive en Redis. */
export type CheckoutSession = {
  readonly cartId: string;
  readonly step: CheckoutStep;
  readonly contact?: { readonly email: string };
  readonly shipping?: Address;
  readonly delivery?: ShippingMethod;
  readonly idempotencyKey: string;
};
