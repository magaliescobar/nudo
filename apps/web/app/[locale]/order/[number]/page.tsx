import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { isLocale } from "@nudo/i18n/config";
import { getDictionary } from "@nudo/i18n/dictionaries";
import { getRepositories } from "@nudo/data/repositories";
import { ButtonLink } from "@nudo/ui/atoms/Button";
import { formatDate, formatPrice } from "@nudo/i18n/format";
import styles from "./page.module.scss";

// `instant=false` + datos de request fuera de Suspense: acceso por token contra
// Mongo en request time.
// El proxy ya rechazó tokens ausentes/inválidos con 404 real (fail-closed); el
// notFound() de acá queda como respaldo para navegaciones cliente (RSC).
export const instant = false;

export const metadata: Metadata = {
  title: "Pedido",
  robots: { index: false, follow: false },
};

type Props = {
  params: Promise<{ locale: string; number: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OrderPage({ params, searchParams }: Props) {
  // El render ya es por request (searchParams/`?token=`); `connection()` queda
  // como refuerzo explícito ante refactors. El 404 real ante token inválido ya
  // lo resolvió proxy.ts antes del render (fail-closed); acá queda de respaldo.
  await connection();
  const { locale, number } = await params;
  if (!isLocale(locale)) notFound();
  const sp = await searchParams;
  const token = Array.isArray(sp.token) ? sp.token[0] : sp.token;
  // Token inválido o ausente ⇒ 404 (nunca 403): no revela que el pedido existe (R17).
  if (!token) notFound();

  const order = await (await getRepositories()).orders.findForConfirmation(number, token);
  if (!order) notFound();

  const t = await getDictionary(locale);
  const o = t.order;

  return (
    <div className={styles.order}>
      <h1>{o.thankYou}</h1>
      <p className={styles.number}>
        {o.number}: <strong>{order.number}</strong>
      </p>
      <p className={styles.meta}>
        {o.emailSent} · {formatDate(locale, order.createdAt)}
      </p>
      <section className={styles.card} aria-label={o.items}>
        <ul>
          {order.lines.map((line) => (
            <li key={line.sku}>
              <span>
                {line.name} · {line.variant} · {line.size} ×{line.qty}
              </span>
              <span>{formatPrice(locale, line.unitPrice.amountInCents * line.qty)}</span>
            </li>
          ))}
        </ul>
        <dl>
          <div>
            <dt>{t.checkout.summary.subtotal}</dt>
            <dd>{formatPrice(locale, order.totals.subtotal.amountInCents)}</dd>
          </div>
          <div>
            <dt>{o.shipping}</dt>
            <dd>{formatPrice(locale, order.totals.shipping.amountInCents)}</dd>
          </div>
          <div className={styles.total}>
            <dt>{o.total}</dt>
            <dd>{formatPrice(locale, order.totals.total.amountInCents)}</dd>
          </div>
        </dl>
      </section>
      <ButtonLink href={`/${locale}`}>{o.continueShopping}</ButtonLink>
    </div>
  );
}
