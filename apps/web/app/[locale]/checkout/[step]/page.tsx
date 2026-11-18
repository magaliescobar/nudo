import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { isLocale, type Locale } from "@nudo/i18n/config";
import { getDictionary } from "@nudo/i18n/dictionaries";
import {
  canAccessStep,
  checkoutSteps,
  firstIncompleteStep,
  stepIndex,
  totals,
} from "@nudo/commerce/checkout";
import type { CheckoutStepName } from "@nudo/commerce/checkout";
import type { FieldErrors } from "@nudo/commerce/schemas";
import { StepIndicator, type StepItem } from "@nudo/ui/molecules/StepIndicator";
import { OrderSummary } from "@nudo/ui/organisms/OrderSummary";
import { getCartId, getCartView } from "../../../../lib/cart";
import { ensureCheckoutSession } from "../../../../lib/checkout";
import {
  ContactForm,
  DeliveryForm,
  PaymentForm,
  ReviewForm,
  ShippingForm,
} from "../../_components/checkout-forms";
import styles from "./page.module.scss";

// `instant=false` + datos de request fuera de Suspense: el checkout depende de
// cookie+Redis y todo el
// flujo debe funcionar sin JavaScript — el contenido streameado de Suspense
// queda oculto sin JS (R16/R36). Los guardas corren antes de responder, así un
// step inválido devuelve 404 real y una sesión vacía redirige a /cart.
export const instant = false;

type Props = {
  params: Promise<{ locale: string; step: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getDictionary(locale);
  return {
    title: t.checkout.title,
    robots: { index: false, follow: false },
  };
}

type StepFormProps = {
  locale: Locale;
  t: Awaited<ReturnType<typeof getDictionary>>;
  errors?: FieldErrors;
  error?: string;
};

const stepForms: Record<CheckoutStepName, (p: StepFormProps) => ReactNode> = {
  contact: ({ locale, t, errors }) => <ContactForm locale={locale} t={t} initialErrors={errors} />,
  shipping: ({ locale, t, errors }) => (
    <ShippingForm locale={locale} t={t} initialErrors={errors} />
  ),
  delivery: ({ locale, t, errors }) => (
    <DeliveryForm locale={locale} t={t} initialErrors={errors} />
  ),
  payment: ({ locale, t, errors }) => <PaymentForm locale={locale} t={t} initialErrors={errors} />,
  review: ({ locale, t, error }) => <ReviewForm locale={locale} t={t} initialError={error} />,
};

/** Errores del POST sin JS: la acción redirige acá con `?e=` (base64url JSON). */
function decodeErrors(raw: string | string[] | undefined): FieldErrors | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    return parsed && typeof parsed === "object" ? (parsed as FieldErrors) : undefined;
  } catch {
    return undefined;
  }
}

export default async function CheckoutStepPage({ params, searchParams }: Props) {
  // El render ya es por request (cookies()/sesión abajo); `connection()` queda
  // como refuerzo explícito ante refactors. Los guardas (404 de step, redirect
  // de sesión vacía) ya corrieron en proxy.ts; acá son respaldo.
  await connection();
  const [{ locale, step }, sp] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  if (!(checkoutSteps as readonly string[]).includes(step)) notFound();

  const current = step as CheckoutStepName;
  const cartId = await getCartId();
  const view = await getCartView(cartId);
  if (view.lines.length === 0) redirect(`/${locale}/cart`);

  const session = await ensureCheckoutSession(cartId!);
  if (!canAccessStep(session, current)) {
    redirect(`/${locale}/checkout/${firstIncompleteStep(session)}`);
  }

  const t = await getDictionary(locale);
  const stepLabel = t.checkout.steps[current];

  const steps: StepItem[] = checkoutSteps.map((name) => {
    const idx = stepIndex(name);
    const cur = stepIndex(current);
    return {
      key: name,
      label: t.checkout.steps[name],
      href: idx < cur ? `/${locale}/checkout/${name}` : undefined,
      state: idx < cur ? "done" : idx === cur ? "current" : "todo",
    };
  });

  const shipping = session.delivery ? totals(view.subtotal, session.delivery).shipping : undefined;

  return (
    <div className={styles.checkout}>
      <header className={styles.head}>
        <h1>{t.checkout.title}</h1>
        <StepIndicator steps={steps} label={t.checkout.title} />
      </header>
      <div className={styles.layout}>
        <section aria-label={stepLabel}>
          <h2 className={styles.stepTitle}>{stepLabel}</h2>
          {stepForms[current]({
            locale,
            t,
            errors: decodeErrors(sp.e),
            error: Array.isArray(sp.error) ? sp.error[0] : sp.error,
          })}
        </section>
        <OrderSummary
          locale={locale}
          cart={view}
          shipping={shipping}
          shippingLabel={t.checkout.summary.shipping}
          labels={{
            title: t.checkout.review.summary,
            subtotal: t.checkout.summary.subtotal,
            shipping: t.checkout.summary.shipping,
            total: t.checkout.summary.total,
            each: "c/u",
            empty: t.cart.empty.title,
          }}
        />
      </div>
    </div>
  );
}
