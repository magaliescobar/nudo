import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { isLocale } from "@nudo/i18n/config";
import { getDictionary } from "@nudo/i18n/dictionaries";
import { CartLine } from "@nudo/ui/organisms/CartLine";
import { OrderSummary } from "@nudo/ui/organisms/OrderSummary";
import { ButtonLink } from "@nudo/ui/atoms/Button";
import { Link } from "@nudo/ui/atoms/Link";
import { getCartId, getCartView } from "../../../lib/cart";
import { removeCartLineForm, updateCartLineForm } from "../../../lib/actions/cart";
import styles from "./page.module.scss";

// `instant=false` + datos de request fuera de Suspense: el carrito depende de
// cookie+Redis y el embudo
// debe entregar HTML completo — el contenido streameado de Suspense queda oculto
// sin JavaScript (R15/R36). Los datos compartidos siguen en `use cache`.
export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getDictionary(locale);
  return {
    title: t.cart.title,
    robots: { index: false, follow: false },
  };
}

export default async function CartPage({ params }: { params: Promise<{ locale: string }> }) {
  // `connection()` difiere el render al request: HTML completo sin JS (R15/R36).
  // Los status reales (404/redirect) los da la guarda de proxy.ts, no la página.
  await connection();
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [t, view] = await Promise.all([getDictionary(locale), getCartView(await getCartId())]);
  const c = t.cart;

  return (
    <div className={styles.cart}>
      <h1>{c.title}</h1>
      {view.lines.length === 0 ? (
        <div className={styles.empty}>
          <h2>{c.empty.title}</h2>
          <p>{c.empty.body}</p>
          <ButtonLink href={`/${locale}`}>{c.empty.cta}</ButtonLink>
        </div>
      ) : (
        <div className={styles.layout}>
          <section aria-label={c.title}>
            {view.notices.includes("price-changed") && (
              <p className={styles.notice} role="status">
                {c.priceChanged}
              </p>
            )}
            {view.notices.includes("out-of-stock") && (
              <p className={styles.notice} role="status">
                {c.outOfStock}
              </p>
            )}
            <ul className={styles.lines}>
              {view.lines.map((line) => (
                <CartLine
                  key={line.sku}
                  line={line}
                  locale={locale}
                  updateAction={updateCartLineForm}
                  removeAction={removeCartLineForm}
                  labels={{
                    quantity: c.quantity,
                    decrease: c.remove,
                    increase: c.quantity,
                    remove: c.remove,
                    priceChanged: c.priceChanged,
                    outOfStock: c.outOfStock,
                    onlyLeft: c.outOfStock,
                    each: "c/u",
                  }}
                />
              ))}
            </ul>
          </section>
          <OrderSummary
            locale={locale}
            cart={view}
            labels={{
              title: c.subtotal,
              subtotal: c.subtotal,
              shipping: t.checkout.summary.shipping,
              total: t.checkout.summary.total,
              each: "c/u",
              empty: c.empty.title,
            }}
          />
          <div className={styles.actions}>
            <Link href={`/${locale}`}>{c.continueShopping}</Link>
            <ButtonLink href={`/${locale}/checkout/contact`} variant="primary">
              {c.checkout}
            </ButtonLink>
          </div>
        </div>
      )}
    </div>
  );
}
