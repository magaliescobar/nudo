// Agujero dinámico del header: MiniCart con la vista resuelta del carrito (R15).
// Server Component async dentro de <Suspense>: precio/stock siempre del servidor.
import type { Locale } from "@nudo/i18n/config";
import { getDictionary } from "@nudo/i18n/dictionaries";
import { MiniCart } from "@nudo/ui/organisms/MiniCart";
import { getCartId, getCartView } from "../../../lib/cart";

export async function CartDrawer({ locale }: { locale: Locale }) {
  const [t, cart] = await Promise.all([getDictionary(locale), getCartView(await getCartId())]);
  return (
    <MiniCart
      locale={locale}
      cart={cart}
      cartHref={`/${locale}/cart`}
      checkoutHref={`/${locale}/checkout/contact`}
      shopHref={`/${locale}`}
      labels={{
        title: t.cart.title,
        empty: t.cart.empty.title,
        subtotal: t.cart.subtotal,
        checkout: t.cart.checkout,
        viewCart: t.cart.viewCart,
        close: t.nav.closeMenu,
        quantity: t.cart.quantity,
        decrease: t.cart.remove,
        increase: t.cart.quantity,
        remove: t.cart.remove,
        continueShopping: t.cart.continueShopping,
      }}
    />
  );
}
