# ADR 019 · Checkout y carrito sin JavaScript (Server Actions + MPA)

- Estado: aceptado (Fase 3)
- Requerimientos: R15, R16, R21, R22; flujo completo sin JS es criterio de aceptación

## Contexto

Las páginas de carrito y checkout usan Server Actions. Sin JS el `<form>` hace un POST de documento (MPA) y la respuesta **no** puede ser un payload Flight con estado de `useActionState`: los errores devueltos como estado solo los interpreta el cliente con JS.

Además, una server action envuelta en una clausura cliente (`(prev, fd) => action(locale, prev, fd)`) no es serializable para el POST sin JS: hay que pasar la acción directamente con `.bind(null, …)`.

## Decisión

1. **Acciones bindeadas**: los formularios de paso de checkout usan `action={serverAction.bind(null, locale)}` (o equivalente por paso). El POST MPA ejecuta la acción y `redirect()` produce un 303 real al siguiente paso.
2. **Errores de validación en la URL**: cuando el POST llega como documento (sin header `Next-Action`), la acción redirige de vuelta al paso con los errores codificados en `?e=<json>`; la página los decodifica y los muestra en el formulario re-renderizado. Con JS la misma acción devuelve el estado de `useActionState` inline y no toca la URL.
3. **Confirmación de pedido**: la acción de confirmar usa un wrapper compatible con `useActionState` para JS y el mismo camino `?error=` para MPA; el resultado es siempre `redirect()` al pedido tokenizado o al paso con error.
4. **Contenido fuera de Suspense**: carrito, checkout, pedido, PDP y PLPs usan `instant = false` y awaits directos para que el HTML completo (formularios incluidos) llegue sin depender del streaming (ver ADR 018 para status codes).
5. **Add-to-cart sin JS**: el form de PDP envuelve el `VariantSelector` completo (los radios de talle deben estar dentro del `<form>` para llegar al FormData) y `SizeSelector` usa `defaultChecked` no controlado.

## Consecuencias

- El flujo compra → checkout (5 pasos) → confirmación → pedido tokenizado funciona igual con y sin JS; los tests `no-js` lo verifican paso a paso.
- Los errores de validación sin JS cuestan una navegación extra (redirect con `?e=`); con JS son instantáneos.
- `?e=`/`?error=` solo transportan códigos de error validados contra un enum, nunca datos del usuario.
