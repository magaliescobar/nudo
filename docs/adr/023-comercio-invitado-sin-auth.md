# ADR 023 · Comercio de invitado: sin autenticación, pedido por token

- Estado: aceptado (Fase 3; aplica a todo el lab)
- Requerimientos: R15–R17, R38; contrato de datos (ADR 004)

## Contexto

NUDO modela una tienda de invitado: no hay usuarios, login, registro ni sesiones de cuenta. Aun así hay que proteger datos privados (carrito, checkout, confirmación de pedido) y evitar que un tercero vea el pedido de otro.

## Decisión

- **Identidad del invitado = cookie `NUDO_CART`** httpOnly, `SameSite=Lax`, 7 días, con un id opaco. Es la única "sesión": no hay JWT ni estado de cuenta.
- **Checkout session** en Redis con `idempotencyKey` generada en servidor antes de mostrar el botón de confirmar; la confirmación es idempotente por esa clave.
- **Pedido confirmado** accesible solo por `/{locale}/order/{number}?token=…`: el token es aleatorio y viaja en la URL que se muestra una sola vez tras confirmar. `GET /api/internal/order-access` (fail-closed, ADR 018) valida `number+token` antes de renderizar; un token inválido es 404 real, indistinguible de un pedido inexistente.
- **Sin datos de tarjeta persistentes**: el PAN del formulario fake nunca sale del POST de la server action ni se guarda en Redis/Mongo — solo el resultado del gateway fake (aprobado/rechazado/timeout) y los últimos 4 dígitos si hicieran falta.
- **Rutas privadas** (`/cart`, `/checkout/*`, `/order/*`) llevan `noindex` y quedan fuera de `'use cache'` público; los tags internos rechazan `cart:*`/`checkout:*` (ADR 017).

## Consecuencias

- No hay superficie de auth que atacar (nada de credenciales, MFA, sesiones); el riesgo residual es la entropía del token del pedido, mitigada con aleatoriedad criptográfica y 404 opaco.
- El invitado que pierde la cookie `NUDO_CART` pierde su carrito: aceptable para el alcance del lab (sin cuentas no hay recuperación).
- Cuando el lab pida login (fase posterior), este ADR se reemplaza por uno de auth con sesiones compartidas entre instancias.
