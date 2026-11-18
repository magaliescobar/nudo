"use client";

// Formularios de los pasos del checkout (R16): useActionState + useFormStatus.
// Sin JS el form postea al server action igual (progressive enhancement de Next);
// con JS los errores por campo aparecen inline sin reload.
import { useActionState } from "react";
import type { Locale } from "@nudo/i18n/config";
import type { Dictionary } from "@nudo/i18n/dictionaries";
import { Button } from "@nudo/ui/atoms/Button";
import { FormField } from "@nudo/ui/molecules/FormField";
import { Radio } from "@nudo/ui/atoms/Radio";
import {
  submitContact,
  submitDelivery,
  submitPayment,
  submitShipping,
  type StepActionState,
} from "../../../lib/actions/checkout";
import { confirmOrderAction } from "../../../lib/actions/order";
import type { ConfirmResult } from "../../../lib/actions/order";
import type { FieldErrors } from "@nudo/commerce/schemas";
import styles from "./checkout-forms.module.scss";

const stepInitial: StepActionState = { ok: false };
const confirmInitial: ConfirmResult = { ok: false };

type Props = { locale: Locale; t: Dictionary; initialErrors?: FieldErrors };

function useStepState(
  action: (locale: Locale, prev: StepActionState, fd: FormData) => Promise<StepActionState>,
  locale: Locale,
) {
  // `.bind` sobre la server action (no una clausura cliente): así el formAction
  // es serializable y el POST sin JavaScript ejecuta la acción en modo MPA.
  return useActionState<StepActionState, FormData>(action.bind(null, locale), stepInitial);
}

function FieldError({ error }: { error?: string }) {
  return error ? (
    <span className={styles.fieldError} role="alert">
      {error}
    </span>
  ) : null;
}

export function ContactForm({ locale, t, initialErrors }: Props) {
  const [state, formAction, pending] = useStepState(submitContact, locale);
  const e = { ...(initialErrors ?? {}), ...(state.errors ?? {}) };
  return (
    <form action={formAction} className={styles.form}>
      <FormField
        label={t.checkout.contact.email}
        name="email"
        type="email"
        autoComplete="email"
        required
        error={e.email}
      />
      <Button type="submit" busy={pending}>
        {t.checkout.contact.continue}
      </Button>
    </form>
  );
}

export function ShippingForm({ locale, t, initialErrors }: Props) {
  const [state, formAction, pending] = useStepState(submitShipping, locale);
  const e = { ...(initialErrors ?? {}), ...(state.errors ?? {}) };
  const s = t.checkout.shipping;
  const opt = t.checkout.review.edit; // opcional
  return (
    <form action={formAction} className={styles.form}>
      <FormField
        label={s.fullName}
        name="fullName"
        autoComplete="name"
        required
        error={e.fullName}
      />
      <FormField
        label={s.line1}
        name="line1"
        autoComplete="address-line1"
        required
        error={e.line1}
      />
      <FormField
        label={s.line2}
        name="line2"
        autoComplete="address-line2"
        optional
        optionalLabel={opt}
        error={e.line2}
      />
      <div className={styles.row}>
        <FormField
          label={s.city}
          name="city"
          autoComplete="address-level2"
          required
          error={e.city}
        />
        <FormField
          label={s.region}
          name="region"
          autoComplete="address-level1"
          required
          error={e.region}
        />
      </div>
      <div className={styles.row}>
        <FormField
          label={s.postalCode}
          name="postalCode"
          autoComplete="postal-code"
          required
          error={e.postalCode}
        />
        <FormField
          label={s.country}
          name="country"
          autoComplete="country-name"
          required
          error={e.country}
        />
      </div>
      <FormField
        label={s.phone}
        name="phone"
        type="tel"
        autoComplete="tel"
        optional
        optionalLabel={opt}
        error={e.phone}
      />
      <Button type="submit" busy={pending}>
        {s.continue}
      </Button>
    </form>
  );
}

export function DeliveryForm({ locale, t, initialErrors }: Props) {
  const [state, formAction, pending] = useStepState(submitDelivery, locale);
  const e = { ...(initialErrors ?? {}), ...(state.errors ?? {}) };
  const d = t.checkout.delivery;
  return (
    <form action={formAction} className={styles.form}>
      <fieldset className={styles.methods}>
        <legend className="vh">{d.title}</legend>
        <label className={styles.method}>
          <Radio name="method" value="standard" required />
          <span>
            <b>{d.standard}</b>
          </span>
        </label>
        <label className={styles.method}>
          <Radio name="method" value="express" />
          <span>
            <b>{d.express}</b>
          </span>
        </label>
      </fieldset>
      <FieldError error={e.method} />
      <Button type="submit" busy={pending}>
        {d.continue}
      </Button>
    </form>
  );
}

export function PaymentForm({ locale, t, initialErrors }: Props) {
  const [state, formAction, pending] = useStepState(submitPayment, locale);
  const p = t.checkout.payment;
  const e = { ...(initialErrors ?? {}), ...(state.errors ?? {}) };
  return (
    <form action={formAction} className={styles.form}>
      <input type="hidden" name="method" value="card" />
      <FormField
        label={p.cardName}
        name="cardName"
        autoComplete="cc-name"
        required
        error={e.cardName}
      />
      <FormField
        label={p.cardNumber}
        name="cardNumber"
        inputMode="numeric"
        autoComplete="cc-number"
        required
        error={e.cardNumber}
        hint={p.testHint}
      />
      <Button type="submit" busy={pending}>
        {p.continue}
      </Button>
    </form>
  );
}

export function ReviewForm({ locale, t, initialError }: Props & { initialError?: string }) {
  const [state, formAction, pending] = useActionState<ConfirmResult, FormData>(
    confirmOrderAction.bind(null, locale),
    confirmInitial,
  );
  const r = t.checkout.review;
  const errorKey = state.ok ? undefined : (state.error ?? initialError);
  const errorText =
    errorKey === "declined"
      ? t.checkout.errors.declined
      : errorKey === "timeout"
        ? t.checkout.errors.timeout
        : errorKey === "stock"
          ? t.checkout.errors.stock
          : errorKey === "price-changed"
            ? t.checkout.errors.priceChanged
            : errorKey === "empty-cart"
              ? t.checkout.errors.emptyCart
              : errorKey
                ? t.checkout.errors.generic
                : undefined;
  return (
    <form action={formAction} className={styles.form}>
      {errorText && (
        <p className={styles.formError} role="alert">
          {errorText}
        </p>
      )}
      <Button type="submit" busy={pending}>
        {pending ? r.placing : r.placeOrder}
      </Button>
    </form>
  );
}
