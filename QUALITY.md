# QUALITY.md — Definición de calidad de NUDO

## Qué significa "calidad" en este proyecto

NUDO es una mini-tienda de referencia: la calidad se define por **el comportamiento
observable del sistema en producción**, no por métricas de cobertura aislada.
Un cambio es de calidad si preserva todas las propiedades de esta lista; si las
degrada, debe decirlo explícitamente en el PR.

## Criterios y cómo se enforzan

### 1. Corrección del flujo de dinero — automático

- **Criterio**: precios, totales, stock e idempotencia se resuelven siempre en el
  servidor; el cliente nunca define importes. Cero pedidos duplicados en retries.
- **Enforcement**: tests Playwright (`tests/api`, `tests/ui`), incluido un test de
  _price tampering_ (un campo `price` inyectado en el POST no altera el subtotal).
- **Nunca se negocia**: si falla, el cambio no entra.

### 2. Compilación y análisis estático limpios — automático

- `pnpm check` = Prettier + ESLint + Stylelint + `tsc --noEmit` estricto
  (`noUncheckedIndexedAccess` incluido) + `next build`. Todo debe pasar.
- Sin `any` innecesarios, sin `@ts-ignore` sin justificación en comentario.

### 3. Progressive enhancement — automático

- **Criterio**: catálogo, PDP, carrito y checkout completos funcionan sin JS
  (MPA + Server Actions por POST). JS mejora, no habilita.
- **Enforcement**: proyecto `no-js` de Playwright cubre el flujo entero.

### 4. Accesibilidad — automático + revisión

- **Criterio**: cero violaciones axe serias/críticas en páginas públicas;
  navegación por teclado, focus visible, labels en formularios, skip link.
- **Enforcement**: `tests/a11y` con axe en CI + revisión manual de interacciones
  complejas (drawer, variantes) en PR.

### 5. Rendimiento y bundle — automático

- **Criterio**: First Load JS por ruta ≤ budgets de `scripts/bundle-budget.json`
  (gzip real de los chunks del documento); LCP < 2.5s, INP < 200ms, CLS < 0.1
  (p75 móvil, medidos por `tests/api/phase5-bundle.spec.ts` y el RUM propio
  `/api/vitals` + `scripts/vitals-report.mjs` + `scripts/lighthouse.mjs`).
- **Enforcement**: spec de budgets en la suite; reporte en `docs/perf/R34-bundle.md`.

### 6. i18n y SEO — automático

- **Criterio**: todo texto visible viene de diccionarios por locale; canonical,
  hreflang, sitemaps, JSON-LD, robots y `llms.txt` correctos; privadas `noindex`.
- **Enforcement**: `tests/api/phase4-seo.spec.ts` (14 checks) + lint que prohíbe
  literales de locale hardcodeados donde corresponda (R26).

### 7. Cache correcto y observable — automático + revisión

- **Criterio**: `use cache` con `cacheLife`/`cacheTag` del perfil correcto; tags
  invalidan datos (no TTL largos para catálogo); nada privado cacheado
  compartido; degradación Redis medida, no silenciada.
- **Enforcement**: `tests/api` (cache, stampede, multi-instancia) + revisión de
  ADRs ante nuevas capas o tags.

### 8. Seguridad básica — automático

- **Criterio**: headers CSP/nosniff/frame-ancestors en `next.config.ts`;
  cookies `httpOnly`+`secure`+`sameSite=lax`; inputs validados server-side;
  Server Actions con rate limit; secretos solo en server (`server-only`);
  sin vulnerabilidades críticas/altas conocidas en dependencias de runtime.
- **Enforcement**: `pnpm audit` (ver §Deuda aceptada), specs de API, revisión.

### 9. Diseño por tokens — automático

- **Criterio**: ningún valor de estilo hardcodeado (color, espaciado, tipografía)
  fuera de `packages/tokens`; la excepción documentada es `lib/og-theme.ts`
  (Satori no procesa CSS — los hex salen del source of truth de tokens).
- **Enforcement**: Stylelint + revisión.

### 10. Documentación viva — revisión

- **Criterio**: `docs/PROGRESS.md`, ADRs y este documento reflejan el estado real;
  toda decisión con trade-offs va a un ADR en `docs/adr/`.
- **Enforcement**: revisión de PR (no automatizable).

## Cobertura de tests: criterio

Se testea el **comportamiento desde el borde** (HTTP + browser), no unidades:
el sistema es la composición de Next + Redis + Mongo, y los bugs viven en las
uniones (caché, guards, i18n, acciones). Se priorizan:

1. Flujo de dinero completo (add → cart → checkout → orden) con y sin JS.
2. Comportamiento HTTP observable: status, redirects, canonical, seguridad.
3. Degradaciones: Redis caído, Mongo frío, multi-instancia.

## Áreas deliberadamente sin test unitario

- **Componentes de presentación puros** (atoms/molecules): se cubren
  indirectamente por axe + snapshot de comportamiento en specs E2E. Un unit test
  de `Icon` no detecta regresiones reales.
- **Schemas valibot**: su correctitud la verifican los specs de acciones que
  rechazan input inválido (phase5-vitals, checkout e2e).
- **`scripts/*` de tooling**: se ejercitan al usarlos; fallan ruidosamente.
- **RUM/Lighthouse**: son medición, no contrato — los budgets de JS sí son
  contrato (spec en CI); los umbrales de CWV se reportan, no bloquean builds
  locales (sí guían revisión).

## Deuda aceptada (con seguimiento en PROGRESS.md)

- `minimatch <11.0.1` (moderate, GHSA-g3hv-75wg-m249): solo en cadena dev
  `eslint-config-next→typescript-estree`; sin superficie en runtime ni build
  del browser. Se acepta hasta que suba la versión de `eslint-config-next`.
- Warning `exceeded max tag count for cacheTag()` en builds: tags de stock por
  SKU exceden el tope de Next; conocido, sin impacto funcional.
