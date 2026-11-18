# ADR 022 · CSP sin nonce: headers estáticos + `unsafe-inline` acotado

- Estado: aceptado (Fase 3)
- Requerimientos: entregables § seguridad (headers + CSP), R36

## Contexto

El lab pide decidir entre nonce por request, hashes, o política sin inline, sabiendo que un nonce por request vuelve dinámica cada página — incompatible con el shell estático de Cache Components.

## Decisión

`Content-Security-Policy` se emite como **header estático** desde `next.config.ts` (se puede cachear con la respuesta) con:

- `default-src 'self'`
- `script-src 'self' 'unsafe-inline'` — Next 16/Turbopack inyecta scripts inline de bootstrap/hidratación que no admiten nonce estático sin volver dinámica la página; `unsafe-inline` queda limitado a scripts same-origin.
- `style-src 'self' 'unsafe-inline'` — los estilos inline de React/`<style>` de `next/font` y atributos `style` lo requieren; SCSS Modules compilan a CSS externo.
- `img-src 'self' data:` — imágenes del seed en `/catalog/*` y avatares/data URIs.
- `connect-src 'self'` — Server Actions y route handlers same-origin.
- `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`, `object-src 'none'`.
- `upgrade-insecure-requests` solo en producción.

Sin nonce y sin `strict-dynamic`: se acepta el riesgo de XSS inline a cambio de mantener el prerender estático. La mitigación real es que no hay HTML no confiable renderizado sin escapar (React escapa por defecto) y no hay `dangerouslySetInnerHTML` en código de la app.

Además: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restrictiva.

## Consecuencias

- La política es cacheable y compatible con PPR/prerender; un nonce por request queda descartado explícitamente.
- `unsafe-inline` en `script-src` es la concesión conocida: si en el futuro se requiere CSP estricta, la alternativa es aceptar páginas dinámicas o migrar a hashes de build.
- Los tests de API verifican la presencia del header.
