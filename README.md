# NUDO · Mini Commerce

Commerce urbano ES/EN con Next.js 16 (App Router, Turbopack, Cache Components), MongoDB Atlas y Redis. Monorepo pnpm: `apps/web` + `packages/{config,tokens,i18n,commerce,data,ui}` (ADR 003).

## Requisitos

- Node ≥ 22.12 y pnpm 10 (`corepack enable`).
- `.env.local` en la raíz con `MONGODB_URI` y `REDIS_URL` (ver `.env.example`).

## Comandos

| Comando                            | Qué hace                                                                                                                                                 |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install`                     | Instala el workspace                                                                                                                                     |
| `pnpm dev`                         | `next dev` (Turbopack) en `apps/web`                                                                                                                     |
| `pnpm build` / `pnpm start`        | Build y servidor de producción                                                                                                                           |
| `pnpm db:seed`                     | Seed determinístico e idempotente: categorías, 300 productos ES/EN, inventario, redirects, imágenes en `apps/web/public/catalog`, índices y Atlas Search |
| `pnpm --filter @nudo/tokens build` | Regenera `css/tokens.css` y `scss/_generated.scss` desde `packages/tokens/src/tokens.ts`                                                                 |
| `pnpm check`                       | Formato, ESLint, Stylelint, typecheck, build y tests Playwright                                                                                          |

## Documentación

- Avance por fase: `docs/PROGRESS.md`
- Decisiones: `docs/adr/`
- Tokens: `docs/design-tokens-map.md` · Redis: `docs/redis-keys.md`

## Agregar un idioma (p. ej. portugués)

El mecanismo está completo; `pt` no se incluye todavía. Agregarlo toca **solo** config, un diccionario y datos de contenido: ninguna página ni componente.

1. **Config** — `packages/i18n/src/config.ts`: agregar la entrada en `localeConfig`:
   ```ts
   pt: { dir: "ltr", intl: "pt-BR" },
   ```
   `Locale`, `locales`, `generateStaticParams`, la negociación de `proxy.ts`, los índices de slug y el índice de Atlas Search se derivan de ahí.
2. **Diccionario** — crear `packages/i18n/src/dictionaries/pt.ts` con `export default { … } satisfies Dictionary`. El compilador marca cada clave faltante. Para una traducción parcial, partir de `es` explícitamente: `{ ...es, nav: { … } } satisfies Dictionary`.
3. **Contenido** — agregar `pt` a los textos localizados del catálogo (`name`, `description`, `slug`, `alt`, colores, categorías) en el seed o en Atlas, y correr `pnpm db:seed` para crear los índices. Lo que falte usa el fallback de ADR 015 (`es`, con `lang` correcto y sin indexar).
4. **Verificar** — `pnpm check`. El test de R26 falla si alguna página o componente nombra un idioma concreto.

Archivos tocados: 2 (`config.ts`, `dictionaries/pt.ts`) + los datos de contenido.
