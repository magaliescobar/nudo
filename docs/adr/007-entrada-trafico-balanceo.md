# ADR 007 · Entrada de tráfico y balanceo (multi-instancia local)

- Estado: aceptado (Fase 2)
- Requerimientos: R04

## Contexto

R04 pide ≥ 3 instancias de la misma build detrás de una entrada de tráfico a elección, y que la app funcione igual caiga donde caiga cada request. Mongo (Atlas) y Redis ya existen: el compose no puede agregarlos.

## Decisión

**nginx 1.27 como reverse proxy, round-robin sin afinidad**, en `docker-compose.yml` + `docker/nginx.conf`:

- `upstream nudo_pool` con `web-1..3:3000`, `zone` compartida entre workers (sin ella cada worker arranca su round-robin en `web-1` y todo cae en la misma instancia: lo detectó el test de reparto), `max_fails=1 fail_timeout=5s`, `keepalive`.
- **Sin sticky sessions**: la afinidad ocultaría estado en memoria; todo estado de usuario vive en Redis (ADR 005).
- `proxy_next_upstream error timeout http_502 http_503` para GET; POST no se reintenta (no idempotente: las Server Actions tienen su propia idempotencia).
- `proxy_buffering off` en páginas: RSC/PPR transmiten en streaming.
- `X-Request-Id`: se propaga el del cliente o se genera (`$request_id`); la app lo devuelve y lo loguea (R05). Access log JSON con instancia y estado de caché de nginx.
- **Solo local/tests:** el header `x-nudo-instance: web-N` fuerza la instancia, para probar el journey cayendo en instancias distintas a propósito (hint de R04).
- Una sola imagen (`nudo-web:${NEXT_DEPLOYMENT_ID}`): la construye `web-1`; `web-2` y `web-3` la reusan (`pull_policy: never`). Mismo `NEXT_DEPLOYMENT_ID`, misma `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` (de `.env.local`, `pnpm env:secrets`) y mismo cache handler.
- Redis del host: `extra_hosts: host.docker.internal:host-gateway` y `docker/entrypoint.sh` reescribe solo el host `localhost`/`127.0.0.1` de `REDIS_URL`. No se modifica el contenedor ni la URL original.

## Alternativas

| Opción              | Por qué no                                                                                          |
| ------------------- | --------------------------------------------------------------------------------------------------- |
| Traefik             | Descubrimiento por labels muy cómodo, pero más piezas (socket de Docker) para 3 servicios fijos.    |
| Caddy               | TLS automático no aporta en local; el cacheo de `/_next/image` requiere plugins.                    |
| Balanceo de Compose | `deploy.replicas` + DNS round-robin no da health pasivo, ni forzar instancia, ni caché de imágenes. |
| CDN real            | Es lo que haríamos en producción (y Vercel lo trae); no es reproducible en local.                   |

## Consecuencias

- Matar una instancia (`docker compose kill web-2`) saca la instancia del pool en el primer fallo; los GET se reintentan en otra (test `tests/multi`).
- La instancia reiniciada vuelve al pool después de `fail_timeout` (5 s).
- nginx es un punto único de falla en local; en producción lo reemplaza el LB/CDN del proveedor.
