"use client";

// Stepper de cantidad (R15): botones −/+ con <output> aria-live.
// Funciona sin JS como input number de respaldo? No: sin JS los botones no hacen nada;
// el campo oculto `name` lleva la cantidad para formularios GET/POST.
// Con JS actualiza el valor y notifica onChange.
import { useState } from "react";
import { Icon } from "../../atoms/Icon/Icon";
import styles from "./QuantityStepper.module.scss";

type QuantityStepperProps = {
  value: number;
  min?: number;
  max?: number;
  /** name del input oculto para enviar la cantidad sin JS. */
  name?: string;
  labels: { decrease: string; increase: string; quantity: string };
  disabled?: boolean;
  onChange?: (qty: number) => void;
};

export function QuantityStepper({
  value: initial,
  min = 1,
  max = 99,
  name,
  labels,
  disabled = false,
  onChange,
}: QuantityStepperProps) {
  const [qty, setQty] = useState(initial);

  const update = (next: number) => {
    const clamped = Math.min(max, Math.max(min, next));
    setQty(clamped);
    onChange?.(clamped);
  };

  return (
    <div className={styles.stepper} role="group" aria-label={labels.quantity}>
      {name && <input type="hidden" name={name} value={qty} />}
      <button
        type="button"
        onClick={() => update(qty - 1)}
        disabled={disabled || qty <= min}
        aria-label={labels.decrease}
      >
        <Icon name="minus" size="sm" />
      </button>
      <output aria-live="polite">{qty}</output>
      <button
        type="button"
        onClick={() => update(qty + 1)}
        disabled={disabled || qty >= max}
        aria-label={labels.increase}
      >
        <Icon name="plus" size="sm" />
      </button>
    </div>
  );
}
