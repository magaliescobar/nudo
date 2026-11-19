# R23 — View Transitions

Implementación con `<ViewTransition>` de React 19.3 (integración nativa del App Router: las
navegaciones de ruta ya son transitions, sin configuración extra). Sin soporte del browser la
app funciona igual: las transiciones simplemente no animan.

## Patrones aplicados

| Patrón                      | Dónde                                                 | Implementación                                                                                                                                                                                                                                    |
| --------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Elemento compartido (morph) | Imagen tarjeta PLP/PDP-related → imagen principal PDP | `view-transition-name` `product-image-{productId}` en `VariantPicker` y `ProductGallery` (`share="auto"`). Las secciones auxiliares de la home usan prefijos propios (`arrivals-*`, `last-units-*`) para no duplicar nombres en una misma página. |
| Dirección distinta          | Pasos del checkout                                    | Slide horizontal (`vt-slide-in`/`vt-slide-out`, `enter`/`exit` con tipo `default`) en `checkout/[step]/page.tsx` — desliza en vez del crossfade del catálogo.                                                                                     |
| Microinteracción            | Contador del mini-cart                                | `<ViewTransition update="vt-pulse">`: pulsa cuando una Server Action actualiza el carrito (las actualizaciones de actions son transitions).                                                                                                       |
| Cambio de variante/imagen   | Galería PDP                                           | `update="auto"` sobre el mismo nombre → crossfade al navegar `?v=`/`?img=`.                                                                                                                                                                       |

## Decisiones

- **Duraciones y curvas desde tokens**: `motion-base`/`ease-move` (slide), `motion-fast`/`ease-enter`
  (pulse), `motion-slow`/`ease-move` (crossfade root). Sin valores literales.
- **`prefers-reduced-motion`**: los pseudo-elementos `::view-transition-*` no heredan la regla `*`;
  se desactivan explícitos (`animation-duration: 0` + `delay: 0`) en `globals.scss`.
- **`default="none"`** en todos los wrappers con nombre/clase: evita que cada elemento nombrado
  crossfadee en transiciones ajenas.
- El morph requiere que el destino renderice en el mismo commit (PDP prefetcheada o ya cacheada);
  si el destino suspende antes, no hay par y la imagen entra con `enter` en vez de morph — comportamiento
  deliberado de la API.

## INP / CLS

- **CLS = 0**: las View Transitions animan snapshots capturados por el browser, no nodos del layout.
- **INP**: la animación corre fuera del hilo de interacción; la documentación oficial advierte que los
  elementos con nombre no responden a hit-testing durante la transición — por eso solo se nombran
  imágenes (no controles) y las duraciones son ≤ 400 ms.

## Verificación

`tests/ui/phase6-view-transitions.spec.ts` (3 tests, chromium):

1. `document.startViewTransition` espiado: navegar tarjeta → PDP dispara una transición y el nombre
   `product-image-{id}` aparece exactamente 2 veces en el snapshot (par saliente/entrante).
2. Agregar al carrito dispara una transición de update (pulso del badge).
3. Contrato CSS: existen `vt-slide-in/out`, `vt-pulse` y la regla `prefers-reduced-motion` cubre
   `::view-transition-*`.
