# ADR 004 · Contrato de datos sin usuarios

## Contexto

La letra (§6) incluye `User`, `Cart.userId`, `Order.customer.userId`, merge de carrito al loguear (R15) y datos precargados (R16). `NUDO-AGENT-INSTRUCTIONS.md` §1.2 excluye R18: no hay login, registro, "Mis pedidos", backoffice ni Auth.js. Todo el comercio es de invitado.

## Decisión

Cambios al contrato de referencia de §6 (tipos en `packages/commerce/src/catalog.ts`):

| Tipo             | Letra                                    | Proyecto                                              |
| ---------------- | ---------------------------------------- | ----------------------------------------------------- |
| `User`           | colección con `role` y `passwordHash`    | **eliminado** (no se crea la colección)               |
| `Cart` (Redis)   | `userId?: string`                        | sin `userId`; el `id` es un UUID en cookie `httpOnly` |
| `Order.customer` | `{ email; userId? }`                     | `{ email }`                                           |
| Repositorios     | productos, inventario, pedidos, usuarios | productos, inventario, categorías, pedidos, redirects |
| Ids en dominio   | `ObjectId`                               | `string` (hex); `ObjectId` solo en `packages/data`    |

Consecuencias en requerimientos:

- **R15**: sin merge al loguear; el carrito se identifica solo por cookie.
- **R16**: el checkout no precarga datos de cuenta; puede recordar el email en la sesión de checkout (Redis, TTL 1 h).
- **Confirmación de pedido**: se accede con `number` + `accessToken` aleatorio (ya previsto en §6), sin sesión de usuario.
- **Rate limit**: los buckets son `search` y `orderConfirm`; no existe `login`.
- **Herramienta de invalidación** (§3.4 de las instrucciones): reemplaza al backoffice; se define en ADR 017.

## Alternativas

- **Mantener `userId` opcional sin usarlo**: deja campos muertos en el contrato y en los índices. Rechazada.
- **Ids `ObjectId` en el dominio**: obliga a `commerce` y a la UI a depender del driver de Mongo, lo que viola R01. Rechazada.

## Consecuencias

- Agregar cuentas en el futuro requiere un ADR nuevo y una migración (`userId` en `Cart`/`Order`, colección `users`).
- Ningún dato personal se asocia a una identidad persistente: el email vive solo en el pedido y, temporalmente, en la sesión de checkout.
