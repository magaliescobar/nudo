// R35: RUM de Core Web Vitals → /api/vitals (sendBeacon, sin librerias extra).
// Client boundary minimo: solo el hook; no renderiza nada.
"use client";

import { useReportWebVitals } from "next/web-vitals";

export function WebVitals() {
  useReportWebVitals((metric) => {
    const body = JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      navigationType: metric.navigationType,
      page: window.location.pathname,
    });
    // sendBeacon sobrevive a unloads (LCP/CLS reportan tarde); fetch de respaldo.
    const blob = new Blob([body], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/vitals", blob)) {
      void fetch("/api/vitals", { method: "POST", body, keepalive: true });
    }
  });
  return null;
}
