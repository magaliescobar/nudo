// Chequeo previo al render para proxy.ts (R11/R14/R16).
// Con Cache Components el shell PPR sale con 200 antes de que la página pueda
// hacer notFound()/redirect(), así que la existencia del slug/categoría y las
// guardas del checkout se resuelven acá, antes del streaming (docs de Next:
// "run the check in Proxy").
// Responde: 204 = seguir · 404 = no existe · 200 {redirect} = redirect real.
// Las rutas de catálogo fallan abierto (si el guard cae, la página renderiza
// igual y su propio notFound() queda de respaldo); el checkout también falla
// abierto porque sus guardas viven en la página.
import { type NextRequest, NextResponse } from "next/server";
import { isLocale, type Locale } from "@nudo/i18n/config";
import {
  checkoutSteps,
  canAccessStep,
  firstIncompleteStep,
  type CheckoutStepName,
} from "@nudo/commerce/checkout";
import { guardInternal, internalHeaders } from "../../../../lib/internal-auth";
import { getProductBySlug } from "../../../../lib/catalog";
import { resolveCategoryPath } from "../../../../lib/categories";
import { getCartView } from "../../../../lib/cart";
import { getCheckoutSession } from "../../../../lib/checkout";
import type { CheckoutSession } from "@nudo/commerce/catalog";

const allow = () => new NextResponse(null, { status: 204, headers: internalHeaders });
const deny = () => new NextResponse(null, { status: 404, headers: internalHeaders });
const redirectTo = (to: string) =>
  NextResponse.json({ redirect: to }, { status: 200, headers: internalHeaders });

async function guardProduct(locale: Locale, slug: string) {
  const product = await getProductBySlug(locale, slug);
  return product && product.status !== "draft" ? allow() : deny();
}

async function guardCategory(locale: Locale, segments: string) {
  const parts = segments.split("/").filter(Boolean);
  const resolved = await resolveCategoryPath(locale, parts);
  return resolved ? allow() : deny();
}

async function guardCheckout(request: NextRequest, locale: Locale, step: string) {
  if (!(checkoutSteps as readonly string[]).includes(step)) return deny();
  const current = step as CheckoutStepName;

  // La cookie viaja en el header `cookie` que proxy.ts reenvía tal cual.
  const cartId = request.cookies.get("NUDO_CART")?.value ?? null;
  const view = await getCartView(cartId);
  if (view.lines.length === 0) return redirectTo(`/${locale}/cart`);

  const stored = await getCheckoutSession(cartId);
  const session: CheckoutSession = stored ?? {
    cartId: cartId!,
    step: "contact",
    idempotencyKey: "guard",
  };
  if (!canAccessStep(session, current)) {
    return redirectTo(`/${locale}/checkout/${firstIncompleteStep(session)}`);
  }
  return allow();
}

export async function GET(request: NextRequest) {
  const denied = await guardInternal(request);
  if (denied) return denied;

  const kind = request.nextUrl.searchParams.get("kind") ?? "";
  const localeParam = request.nextUrl.searchParams.get("locale") ?? "";
  const value = request.nextUrl.searchParams.get("value") ?? "";
  if (!isLocale(localeParam)) {
    return NextResponse.json({ error: "bad_locale" }, { status: 400, headers: internalHeaders });
  }
  const locale = localeParam as Locale;

  switch (kind) {
    case "product":
      return value ? guardProduct(locale, value) : deny();
    case "category":
      return value ? guardCategory(locale, value) : deny();
    case "checkout":
      return value ? guardCheckout(request, locale, value) : deny();
    default:
      return NextResponse.json({ error: "bad_kind" }, { status: 400, headers: internalHeaders });
  }
}
