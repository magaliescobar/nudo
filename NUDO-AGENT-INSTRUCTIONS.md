# NUDO — Instrucciones para el agente de desarrollo

> Documento operativo para un agente IA que trabaja **dentro del IDE, sobre un proyecto Next.js ya creado**.
> Fuente de verdad funcional: la letra del "Lab Avanzado de Next.js — Mini Commerce NUDO" (R01–R38, §3 Reglas del juego, §6 Modelo de datos), ubicada en **`docs/lab-nextjs-avanzado-commerce.md`** dentro del proyecto. Referencias visuales (paleta, diseño, componentes): **`docs/templates/`** (ver §3.5). Este documento **no reemplaza la letra**: la acota, la ordena y fija el modo de trabajo.
> Ubicación sugerida en el repo: `AGENTS.md` (o `docs/NUDO-AGENT-INSTRUCTIONS.md` referenciado desde `AGENTS.md`).

---

## 0. Cómo trabajar (leer primero)

0. **Leé la letra completa antes de hacer cualquier cosa:** `docs/lab-nextjs-avanzado-commerce.md`. Es la especificación de referencia (requerimientos R01–R38 con Contexto, Se pide, Aceptación y Hint; modelo de datos en su §6; arquitectura en su §5). Cada vez que este documento cite un R-ID, una sección o una tabla (p. ej. "§5.2", "matriz de R19"), se refiere a esa letra. Antes de empezar cada fase, **releé los requerimientos de esa fase en la letra** y usá sus criterios de Aceptación como checklist. Si este documento y la letra difieren, prevalece este documento solo en lo que explícitamente acota (§1, §2 y §3); en todo lo demás prevalece la letra. No modifiques ese archivo.
0b. **Revisá las referencias de diseño** en `docs/templates/` (§3.5) antes de tocar tokens, estilos o componentes. La paleta, la tipografía y el aspecto de los componentes salen de ahí, no de tu criterio.
1. **Inspeccioná antes de escribir.** Lo primero es leer `package.json`, `next.config.*`, `tsconfig.json`, estructura de carpetas, versión instalada de Next/React, gestor de paquetes (npm/pnpm/yarn), y lo que ya exista. No asumas un proyecto vacío.
2. **No confíes en tu memoria para APIs de Next.js 16.** `'use cache'`, `cacheLife`, `cacheTag`, `updateTag`, `revalidateTag`, `cacheHandlers`, `proxy.ts`, `<ViewTransition>`, `next/form` cambiaron entre versiones menores. Consultá la documentación de la **versión instalada** (`node_modules/next/dist/docs/` si existe; si no, nextjs.org/docs de esa versión). Ante la duda, verificá con un build real.
3. **Trabajá por fases (§4), en orden.** Al final de cada fase: `typecheck` + `lint` + `build` + tests en verde, y un commit con mensaje convencional (`feat(plp): ...`). No avances con la fase anterior rota.
4. **Cada decisión no impuesta por la letra va a un ADR** en `docs/adr/NNN-titulo.md` (formato: Contexto · Decisión · Alternativas · Consecuencias). Listado mínimo de ADRs en §6.
5. **Evidencia, no afirmaciones.** Para cada criterio de aceptación dejá la forma de verificarlo: test, script o comando documentado en `docs/evidence/`. El objetivo del lab es poder *defender* decisiones con datos.
6. **Si algo es ambiguo o contradictorio, frená y preguntá** (ver §2 y §3 para los casos ya detectados). No inventes silenciosamente.
7. **Nunca** commitees secretos. `.env.local` está fuera de git y **ya contiene `MONGODB_URI` y `REDIS_URL`** (§3.7): no lo sobrescribas, no lo recrees, no imprimas sus valores en logs, ADRs, tests ni salidas, y no lo copies a ningún archivo versionado. `.env.example` se mantiene actualizado solo con **placeholders** (sin valores reales).
8. **Al terminar cada fase**, actualizá `docs/PROGRESS.md` (qué requerimientos quedaron cubiertos, cuáles parciales, deuda conocida).
9. Idioma: código, nombres e identificadores en inglés; comentarios, ADRs, README y contenido de UI/seed en **español** (y la UI/seed también en **inglés**, ver i18n).

---

## 1. Alcance

### 1.1 Dentro del proyecto

Todos los requerimientos de `docs/lab-nextjs-avanzado-commerce.md` **excepto** los de §1.2. Incluye Bloques A, B (R08 solo sin el catálogo navegable: el Atomic Design y las variantes/estados **sí** se implementan), C (menos R18), D, E (R26 solo el *mecanismo*), F, G y H.

### 1.2 Fuera del proyecto — NO implementar

| Req.            | Qué se excluye                                                                 | Consecuencias que tenés que manejar                                                                                                                                                                                                                                                                  |
| --------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **R08 (parcial)** | Solo el **catálogo navegable** (Storybook o propio) | **No generes Storybook ni página de catálogo.** Pero el **Atomic Design se mantiene** como organización del código (átomos → moléculas → organismos, con la regla de composición de la letra) y cada componente debe **implementar todas sus variantes y estados** (§3.5). El catálogo de referencia ya existe como HTML en `docs/templates/`. Los checks que la letra ataba al catálogo (R21 "superponer skeleton y componente real", R09 a11y por componente, ES/EN y claro/oscuro) se verifican con tests de **Playwright** (§3.6) en vez de con catálogo. |
| **R18**         | Login, registro, "Mis pedidos", backoffice, `proxy.ts` de admin, Auth.js       | **No hay usuarios.** Todo es invitado: sin merge de carrito al loguear (R15), sin datos precargados (R16), sin `User`/`role`. Se elimina `userId` de `Cart`/`Order`/`Order.customer` (cambio de contrato → ADR). Ver §3.4 para reemplazar el backoffice como herramienta de demo de invalidación. |
| **R26 (parcial)** | Agregar portugués (`pt`)                                                    | **No agregues `pt`.** Sí tenés que construir el mecanismo completo para que agregarlo toque solo: config de locales + un diccionario + datos de contenido. Documentá el procedimiento en el README (ver Fase 1). El usuario lo agrega por su cuenta.                                                  |

Todo lo demás de la letra aplica tal cual. Donde un requerimiento mencione cuenta/login/backoffice/admin (R15, R16, R20, R29, R38), usá el reemplazo de §3.4.

---

## 2. Reglas no negociables (resumen de §3 de la letra)

- Next.js **App Router** con `cacheComponents: true`. Prohibido Pages Router.
- TypeScript `strict: true`.
- Bundler: **Turbopack** (dev y build). Prohibido configurar webpack (`webpack()` en `next.config`, plugins/loaders de webpack, flag `--webpack`) y usar herramientas que dependan de webpack (p. ej. `@next/bundle-analyzer`). Ver §3.8.
- Estilos: **solo SCSS Modules** (`*.module.scss` junto a cada componente). `@use`/`@forward`; **`@import` prohibido**. Prohibido Tailwind, CSS-in-JS con runtime y librerías de componentes con estilos. Headless de a11y: permitido con ADR. Nada de imports `~` en Sass (Turbopack no los soporta).
- Datos: **MongoDB Atlas** (o la instancia Mongo equivalente con Atlas Search) accedido **exclusivamente a través de `MONGODB_URI`** de `.env.local` (§3.7). Facetas con **Atlas Search**.
- Redis obligatorio (carrito, sesión de checkout, caché compartida, rate limit, locks/idempotencia, pub/sub).
- ≥ 2 instancias intercambiables (el objetivo es ≥ 3 en Docker Compose, R04).
- i18n: ES y EN; ningún string de UI hardcodeado.
- Pagos simulados (gateway fake: aprobado / rechazado / timeout).
- Sin commerce SaaS. Cada dependencia de runtime del cliente se justifica (peso, alternativa nativa). Preferí plataforma: `Intl`, View Transitions, `<dialog>`, `popover`.
- **Discrepancia detectada en la letra:** el encabezado dice Next.js `16.3.x` y la tabla de reglas dice `16.4.x`. **No cambies la versión por tu cuenta.** Usá la que ya tiene el proyecto; si es menor a 16.3, avisá y proponé actualizar (decisión del usuario). Registrá la versión final en un ADR.

---

## 3. Decisiones de contexto ya tomadas (respetalas)

### 3.1 Estructura: monorepo con workspaces y Turbopack (R01) — DECIDIDO

La letra pide monorepo con paquetes (`tokens`, `ui`, `i18n`, `commerce`, `data`, `config`). **El usuario decidió que el proyecto será un monorepo con workspaces y que el bundler es Turbopack** (detalles en §3.8). El proyecto actual es una app Next.js ya creada, así que:

- **Paso 0:** detectá si ya es monorepo. Si no lo es, **migralo a workspaces** (`apps/web` + `packages/*`) con el gestor de paquetes que ya usa el proyecto, sin volver a preguntar la forma. Antes de mover nada, escribí el plan de migración (qué se mueve y adónde) en el ADR 003 y hacé la migración en **commits aislados** usando `git mv` para conservar el historial; verificá `build` y `dev` en verde al terminar la migración, antes de agregar funcionalidad.
- Subpath `exports` explícitos en cada paquete (sin importar todo desde la raíz).
- Se mantienen las reglas de R01: `commerce` no conoce Next ni React; `ui` no conoce Atlas ni Redis; `data` es `server-only` y nunca llega a un bundle de cliente; un import prohibido **rompe lint o build** (fronteras con ESLint `no-restricted-imports`/`eslint-plugin-boundaries` o `dependency-cruiser`, más un test de Playwright o script que demuestre que un import prohibido falla).

### 3.2 Redis: local primero, Vercel después

Diseñá Redis detrás de una **interfaz propia** (`packages/data/redis` o equivalente) para que el entorno sea intercambiable por variables de entorno, sin tocar el código de negocio:

- **Local (default, desde Fase 1):** la instancia local de Redis **ya está levantada** y su URL está en `REDIS_URL` de `.env.local` (§3.7). **No crees ni modifiques el contenedor de Redis ni la URL.** Cliente TCP (`ioredis` o `redis`; justificá en ADR) con **timeouts de conexión y de comando explícitos**, reconexión con backoff y *circuit breaker* simple (R03: Redis caído ⇒ Home/PLP/PDP responden 200; carrito/checkout muestran error amable, no 500).
- **Vercel (preparado, no bloqueante):** Redis en Vercel se provee vía Marketplace (p. ej. Upstash) que expone variables de entorno (URL TCP `rediss://` y/o REST). El adaptador debe poder usar:
  - `REDIS_URL` (TCP, TLS si el esquema es `rediss://`), y
  - opcionalmente un adaptador REST (`@upstash/redis`) detrás de la misma interfaz si el TCP resulta inviable en funciones serverless.
  Seleccionalo con `REDIS_DRIVER=tcp|rest`. Documentá las variables exactas que Vercel inyecta una vez provisionado (verificalo en la documentación vigente, no de memoria).
- **Pub/sub y L1 en Vercel:** el funcionamiento serverless no mantiene procesos largos, así que la invalidación L1 por pub/sub **no aplica** ahí. Hacé que L1+pub/sub sea activable por flag (`CACHE_L1_PUBSUB=true|false`): `true` en Docker multi-instancia, `false` en Vercel (donde L2 en Redis + tags + `updateTag`/`revalidateTag` son la fuente). Documentalo en el ADR de caché.
- **Cache handler remoto:** implementá `cacheHandlers` (para `'use cache'`) con L1 memoria + L2 Redis. Respetá exactamente la interfaz de la versión instalada de Next. Incluí: prefijo de claves por entorno y `deploymentId`/build id, serialización segura, TTL alineado al `cacheLife`, índice de tags para invalidación, protección anti-*stampede* (single-flight por clave caliente con lock en Redis) y degradación si Redis cae.

### 3.3 Facetas: MongoDB Atlas Search

- Usá `$searchMeta` con `facet` (o `$search` + `$$SEARCH_META`) en **una sola consulta** que devuelva resultados + conteos (R02/R11). Logueá/medí con `Server-Timing` que es una ida a la base.
- Entorno: la conexión sale **siempre de `MONGODB_URI`** (`.env.local`), ya sea Atlas en la nube o una instancia local con Atlas Search (§3.7). No levantes tu propio contenedor de Mongo. El script de setup **crea el índice de Atlas Search de forma reproducible** (definición versionada en el repo, p. ej. `packages/data/search/products.index.json`, y un script `db:search-index` que usa la API de índices de búsqueda del driver). Si la conexión resulta ser un `mongod` sin Atlas Search, **frená y avisá** al usuario: sin Atlas Search no se puede cumplir R02/R11.
- Definición del índice (a refinar según tu modelo final):
  - Analyzers por idioma: `lucene.spanish` para campos `*.es`, `lucene.english` para `*.en`. Los textos localizados se indexan por campo-idioma (generado desde la config de locales, no hardcodeado).
  - Tipos `stringFacet` para categoría, color, talle, marca; `numberFacet` (con `boundaries`) para rango de precio; `token`/`string` para filtros exactos; `autocomplete` opcional para búsqueda.
- **Problema de diseño que tenés que resolver y documentar en ADR:** las facetas de color/talle/precio/"solo con stock" viven en `variants[].skus[]`, y el **stock está en otra colección a propósito** (para que una venta no invalide el producto). Opciones: (a) denormalizar un documento de búsqueda `product_search` (un doc por producto con `colors[]`, `sizes[]`, `minPrice/maxPrice`, `brand`, `categoryPath[]`, `inStock`) mantenido por el data layer; (b) `$search` embebido con documentos anidados. Elegí, justificá, y asegurate de que el flag `inStock` se actualice cuando cambia el inventario sin invalidar la caché del producto completo.
- Conteos que reflejan los demás filtros activos; opciones con 0 resultados deshabilitadas.

### 3.4 Sin R18: cómo demostrar invalidación y proteger operaciones internas

Como no hay backoffice ni auth, necesitás una forma de **mutar precio/stock/nombre/estado/slug y ver la invalidación** (R04, R15, R20, R29, R38):

- Implementá un **panel interno mínimo NO público** o, preferiblemente, **scripts CLI** (`pnpm|npm run catalog:set-price`, `catalog:set-stock`, `catalog:rename`, `catalog:set-status`, `catalog:set-slug`) que llamen a la capa `commerce`/`data` y disparen la invalidación vía un **Route Handler interno** (`POST /api/internal/invalidate`) protegido por secreto compartido (`INTERNAL_API_SECRET`, comparación en tiempo constante, rate limit, no indexable, bloqueado en `robots`).
- Cada mutación invalida **exactamente** lo debido: precio ⇒ PDP + tarjetas PLP del producto + carritos (revalidación de líneas en servidor); stock ⇒ solo `stock:{sku}` (no descripción ni galería); slug ⇒ crea `Redirect` 301; estado `discontinued` ⇒ política R32 + sitemap/llms.txt.
- Los criterios de aceptación que mencionan "backoffice" se verifican con estas herramientas.
- La autorización de ese handler (secreto) es el equivalente a "una Server Action de admin sin sesión falla" (R38): test que lo demuestra.

### 3.5 Referencias de diseño: `docs/templates/` y Atomic Design sin catálogo

En `docs/templates/` hay dos HTML de referencia. **Son solo lectura y no forman parte de la app** (no los importes, no los sirvas, no los copies a `public/`):

| Archivo | Qué es | Para qué usarlo |
| --- | --- | --- |
| `catalogo-componentes-nudo.html` | Catálogo de componentes con **tokens en 3 niveles**, temas, y los componentes por nivel atómico con sus variantes y estados | **Fuente principal de tokens y de componentes.** Paleta, tipografía, espaciado, radios, sombras, movimiento, z-index, temas y especificación visual de cada átomo/molécula/organismo |
| `Nudo_Commerce_3.html` | Prototipo navegable de la tienda (HTML empaquetado; la UI vive en un bundle JS con React, por lo que abrirlo en el navegador es más fiable que leer el código) | **Solo para entender flujo y comportamiento:** recorrido Home → PLP → PDP → carrito → checkout → confirmación, interacciones y microinteracciones. Su look NO es la referencia visual (ver abajo) |

**Qué tiene que extraer el agente (Fase 0/1):**

- **Tokens** del catálogo, respetando sus 3 niveles y nombres (adaptá la sintaxis a la fuente única de R06, pero conservá la semántica):
  - Primitivos `--p-*`: `ink` (950…100), `concrete` (0…300), `cobalt`, `coral`, `green`, `amber`, `red`; fuente `Archivo` (+ mono del sistema); escala tipográfica 12→88 px; espaciado `space-1…16`; radios `0/2/6/12/full`; sombras `1/2/3`; duraciones `75/150/250/400 ms`; easings `out`, `in-out`, `snap`; z-index `base/sticky/drawer/toast`.
  - Semánticos `--color-*`, `--text-*`, `--space-*`, `--shadow-*`, `--radius-*` (`control`, `card`, `panel`, `pill`).
  - De componente: `--button-*`, `--swatch-*`, `--card-*`, etc.
  - **Temas:** `light` (default), `dark` y **`drop`** (tema de campaña), además de `auto` (según `prefers-color-scheme`). Se cambian **solo reasignando semánticos** (R06). `drop` modifica, entre otros, los radios a 0.
- **Valores exactos**: leelos del `<style>`/tokens del HTML (no los aproximes por captura). Generá un `docs/design-tokens-map.md` que mapee cada token del template → token del proyecto.
- **Fuentes:** `next/font` (R36) con la familia del catálogo (Archivo) con subset y fallback ajustado.
- **Diferencias entre los dos HTML y precedencia (CONFIRMADA por el usuario):** el prototipo `Nudo_Commerce_3.html` usa una estética distinta del catálogo (neutros cálidos `#F3F1EC`/`#151515`, acento naranja `#FF5A1F`, tipografías Geist/Bricolage Grotesque, tarjetas con radio 18 px), mientras que el catálogo usa ink/concrete/cobalt/coral con Archivo. **Los dos HTML son solo guías.** Los **tokens, colores, tipografía y aspecto de componentes salen del catálogo** (`catalogo-componentes-nudo.html`). El **prototipo sirve para entender el flujo y el comportamiento** (navegación entre pantallas, interacciones, orden de pasos); **no copies su paleta ni su tipografía**. Todo lo que ninguno de los dos defina (pantallas o estados no cubiertos, espaciados puntuales, copy, comportamientos) lo **inferís** de forma coherente con el catálogo y con la letra, y lo registrás brevemente en el ADR de diseño. No mezcles las dos paletas. Dejá la tabla de diferencias en el ADR de diseño; **no hace falta volver a preguntar** por la precedencia.

**Atomic Design sin catálogo (R08 parcial):**

- Estructura obligatoria del código de UI: `atoms/`, `molecules/`, `organisms/` (templates/pages opcionales), con la regla de composición: un átomo no importa moléculas ni organismos; una molécula no importa organismos. Verificala con la misma herramienta de fronteras de R01.
- Inventario mínimo (el mismo del catálogo y de la letra): **Átomos** Button, Link, Icon, Price, Badge, Swatch, Input, Checkbox, Radio, Skeleton, VisuallyHidden, Spinner · **Moléculas** SwatchGroup, SizeSelector, QuantityStepper, FacetOption, PriceRange, Breadcrumbs, FormField, Pagination, LocaleSwitcher, StepIndicator · **Organismos** ProductCard, ProductGrid, FacetPanel, ProductGallery, VariantSelector, CartLine, MiniCart, CheckoutStep, OrderSummary, Header, Footer.
- **Variantes y estados completos por componente**, tal como figuran en el catálogo de referencia (abrilo y tomá la lista exacta de cada uno): variantes (p. ej. Button `primary`/`accent`/`secondary`, tamaños `md`/`sm`) y estados `default`, `hover`, `focus-visible`, `active`, `disabled`, `loading`, `error`, `vacío`, `seleccionado`, `agotado` según corresponda. Cada variante/estado se implementa **con tokens** (nada de valores mágicos) y respeta tema claro/oscuro/`drop`, ES/EN y `prefers-reduced-motion`.
- **Server vs Client:** cada componente es Server Component salvo que necesite interactividad real; documentá el motivo en un comentario de cabecera breve (equivale a lo que el catálogo mostraba).
- **Sin catálogo, igual hace falta evidencia (solo Playwright, §3.6):** para cada componente, un test de Playwright que ejercite sus variantes y estados principales (hover, focus-visible, disabled, loading, error, vacío, seleccionado, agotado según corresponda) en los tres temas y en ES/EN, más un chequeo de a11y con axe y, para los skeletons, un chequeo dimensional contra el componente real. Un componente sin sus variantes/estados implementados **no se considera terminado**. (Como la app no tiene catálogo, estos tests recorren las propias pantallas reales o una ruta interna de pruebas no indexable y excluida de producción, a decisión del agente con ADR.)
- Todo componente usado en la app debe existir dentro de esta estructura (no crear "botón número 7"): antes de crear uno nuevo, buscá si existe en `atoms/molecules/organisms`.


### 3.6 Testing: solo Playwright

El usuario no tiene experiencia con otros frameworks de test, así que **Playwright Test (`@playwright/test`) es el único framework de pruebas del proyecto**. Reglas:

- **No instales ni uses** Vitest, Jest, Testing Library, Cypress, Storybook ni similares. Si algún requerimiento de la letra sugiere un test "unitario", implementalo igualmente con Playwright Test.
- **Tests de UI/E2E:** con `page` (navegador). Cubren journeys, componentes y sus variantes/estados, a11y (con `@axe-core/playwright`, única dependencia extra de testing permitida), teclado, sin-JS (`javaScriptEnabled: false` en un proyecto de Playwright), temas, ES/EN, CLS y skeletons.
- **Tests sin navegador (API/integración):** usá la fixture `request` de Playwright contra la app levantada, o tests Playwright "sin página" que importen directamente la capa de dominio/datos (TypeScript) para lo que no tiene UI: concurrencia de stock (50 compras simultáneas), idempotencia de confirmación, rate limit, status codes y `Location` de redirects (R32), `meta robots`/canonical/hreflang (R27/R28), sitemaps/`llms.txt`/JSON-LD (R29–R31), reglas de precio/stock de `commerce`.
- **Proyectos de Playwright** (en `playwright.config.ts`): `chromium` (UI, desktop), `mobile` (viewport móvil), `no-js`, `api` (sin navegador). Un servidor de prueba lo levanta `webServer` en la config, apuntando a Docker (Redis/Mongo) ya iniciado; documentá el comando.
- **Verificaciones que no son pruebas** (presupuestos de bundle, Lighthouse, analizador de bundles, stylelint/ESLint de fronteras) siguen siendo scripts de CI en Node, no framework de test; mantenelos simples y documentados.
- Scripts `npm|pnpm run test`, `test:ui`, `test:api`, `test:a11y` como alias de proyectos de Playwright. La carpeta de pruebas es `tests/` en la raíz del proyecto, con subcarpetas `ui/`, `api/`, `a11y/`.
- Cada test debe ser legible para alguien que recién empieza: nombres descriptivos en español, un `describe` por requerimiento (`R13 · ProductCard`), y un comentario corto que indique qué criterio de Aceptación de la letra comprueba.

### 3.7 Configuración desde `.env.local` (MongoDB y Redis)

- **Fuente única de conexión:** `MONGODB_URI` (MongoDB/Atlas) y `REDIS_URL` (Redis local) definidas en `.env.local` en la raíz del proyecto. **Esos nombres son fijos**; no los renombres ni crees alias (`DATABASE_URL`, etc.). Antes de empezar, verificá que ambas existan y fallá con un mensaje claro si falta alguna (validación al arranque con un módulo `env` tipado, `server-only`, que nunca exponga valores).
- **Next.js** carga `.env.local` solo. Los **scripts** (`db:seed`, `db:search-index`, `catalog:*`) y los tests de Playwright deben cargarla también: usá `node --env-file=.env.local` / `tsx --env-file=.env.local` o el mecanismo equivalente del gestor de paquetes, sin agregar `dotenv` salvo que haga falta (justificar).
- **Nombre de la base de datos:** tomalo del path de `MONGODB_URI` si lo incluye. Si no lo incluye, usá un valor por defecto documentado (p. ej. `nudo`) y avisalo al usuario en `PROGRESS.md`; no inventes una variable nueva sin necesidad.
- **Seguridad de los datos existentes:** esa base puede contener datos del usuario. El seed **no debe borrar colecciones ajenas**; trabajá solo con las colecciones del proyecto, con prefijo/nombres propios, y hacé el seed idempotente. Antes de cualquier operación destructiva (drop, reseed completo), pedí confirmación explícita. Idem para Redis: **prefijá todas las claves** (p. ej. `nudo:{env}:...`) y nunca uses `FLUSHALL`/`FLUSHDB`.
- **Contenedores de la app (R04):** dentro de un contenedor, `localhost` apunta al propio contenedor. Si `REDIS_URL` (o `MONGODB_URI`) apuntan a `localhost`/`127.0.0.1`, el compose debe cargar `.env.local` (`env_file`) y sobreescribir **solo el host** para las instancias de la app (p. ej. `host.docker.internal` con `extra_hosts: ["host.docker.internal:host-gateway"]`), sin tocar `.env.local`. Documentá el mecanismo en el README y en `.env.example`.
- **Tests de Playwright:** el `webServer` y los tests leen `.env.local`. Los tests que escriben datos usan prefijos/colecciones de prueba propios y se limpian solos.
- **Vercel:** mismos nombres de variable, cargadas en el panel del proyecto (§5).

### 3.8 Turbopack en el monorepo

Todo esto debe verificarse contra la **documentación de la versión instalada** de Next (la compatibilidad de Turbopack cambia entre versiones) y con builds reales:

- **Raíz del monorepo:** configurá `turbopack.root` (y `outputFileTracingRoot` si se usa `output: 'standalone'` para las imágenes Docker de R04) apuntando a la raíz del workspace, para que Turbopack resuelva los paquetes internos. Dejá en el ADR 003 los valores usados y por qué.
- **Paquetes internos:** si exponen TypeScript/SCSS sin compilar, declaralos en `transpilePackages` de `apps/web/next.config.*`; si se compilan a ESM, el `exports` debe apuntar a la salida. Elegí una estrategia y documentala (ADR 003). Los paquetes deben ser ESM, con `exports` por subpath y `sideEffects` correcto (R34).
- **Sass:** Turbopack **no soporta imports con `~`**. Para que `apps/web` y `packages/ui` consuman la capa compartida de `packages/tokens` con `@use`, usá rutas de paquete resolubles por Turbopack o `sassOptions` (`loadPaths`/`includePaths`, según lo que soporte la versión instalada) y verificá en build de producción que **no se duplican reglas** (R07). Cada `*.module.scss` vive junto a su componente.
- **`server-only` / `client-only`:** deben funcionar a través de los límites entre paquetes; el test de R01 (importar `data` desde un Client Component rompe el build) se hace con Turbopack, no con otro bundler.
- **Análisis de bundles (R34):** no uses `@next/bundle-analyzer` (webpack). Usá el analizador propio de Turbopack incluido en la versión instalada de Next (consultá el comando exacto en la documentación) y/o `source-map-explorer` sobre source maps de producción (`productionBrowserSourceMaps`). Documentá el comando que sí funcione.
- **`cacheHandlers`, `proxy.ts`, `<ViewTransition>`:** confirmá que funcionan bajo Turbopack con paquetes del workspace (el cache handler debe ser resoluble desde `next.config`).
- **Scripts de Node** (`db:seed`, `catalog:*`) importan paquetes del workspace: usá un runner TypeScript compatible con workspaces (`tsx`) y `--env-file=.env.local` (§3.7), sin depender de Turbopack.
- Si algo es incompatible con Turbopack, **no cambies de bundler**: documentá la alternativa compatible en un ADR o avisá al usuario.

---

## 4. Plan por fases

Marcá R-IDs cubiertos al cerrar cada fase. Cada fase termina con: typecheck, lint, build, tests, commit, `PROGRESS.md`.

### Fase 0 — Descubrimiento y andamiaje
- Verificar que existe `docs/lab-nextjs-avanzado-commerce.md` y leerlo completo. Si no está, **frená y avisá al usuario**: no reconstruyas la letra de memoria.
- Inspección del repo (§0.1). Aplicar §3.1 (monorepo con workspaces, ya decidido) y §3.8 (Turbopack): migración, `turbopack.root`, `transpilePackages`/`exports` y Sass entre paquetes. Dejá `dev` y `build` con Turbopack funcionando en el monorepo antes de seguir.
- ADRs 001 (versión Next/React y gestor de paquetes) y 002 (Atomic Design sin catálogo: estructura de carpetas, reglas de composición y mapa de tokens/diseño desde `docs/templates/`, incluida la tabla de diferencias entre los dos HTML y la precedencia ya confirmada: catálogo = tokens/diseño, prototipo = flujo/comportamiento; §3.5). Abrir y revisar ambos HTML de `docs/templates/`.
- `.env.example` con todas las variables como placeholders (`MONGODB_URI`, `REDIS_URL`, `REDIS_DRIVER`, `CACHE_L1_PUBSUB`, `INTERNAL_API_SECRET`, `NEXT_PUBLIC_SITE_URL`, `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`, `NEXT_DEPLOYMENT_ID`...). **No agregues servicios de Redis ni de Mongo a Docker para desarrollo:** ya existen y se configuran por `.env.local` (§3.7). El `docker-compose.yml` se crea en la Fase 2 (R04) solo para las instancias de la app y la entrada de tráfico.
- Estructura de módulos y fronteras automáticas (R01) con test que prueba que un import prohibido falla. `server-only` en `data`.
- Tooling base: ESLint, Prettier, Stylelint (ver R07) y **Playwright Test como único framework de pruebas** (§3.6), script `check` que corre todo.

### Fase 1 — Fundaciones: tokens, SCSS, i18n, datos, Redis, seed
- **R06 Tokens**: partí de los tokens del catálogo de `docs/templates/` (§3.5; temas `light`/`dark`/`drop`). Fuente única (TS/JSON) → genera CSS custom properties + API Sass (`@use 'tokens'`: `token()`, `breakpoint()`, `motion()`). 3 niveles (primitivo → semántico → componente), cada nivel solo referencia al anterior. Categorías mínimas: color, tipografía, espaciado, radios, sombras, z-index, breakpoints, duraciones/curvas. **Tema oscuro y tema de campaña** reasignando solo semánticos. Script de build de tokens reproducible.
- **R07 SCSS**: `@forward` solo de funciones/mixins/variables (**ningún archivo compartido emite CSS**); mixins (breakpoints, container queries, focus-visible, reduced-motion, truncado, skeleton shimmer); `@layer` (reset, tokens, base, components, utilities); container queries en ProductCard y grilla PLP; `:has()`, `:focus-visible`, `:user-invalid`; `prefers-reduced-motion` y `prefers-color-scheme`. **Stylelint** con: sin valores mágicos (colores/tamaños/sombras/duraciones solo desde tokens), profundidad máxima de nesting, `@import` prohibido, `!important` solo con justificación. Verificación de que importar la capa compartida desde muchos módulos no duplica reglas en el CSS de salida.
- **R24/R25/R26 (mecanismo) i18n**:
  - `locales` y `defaultLocale` en **una sola config**; `type Locale` derivado de ella (`as const`); `Localized<T>` derivado.
  - Diccionarios tipados (clave faltante ⇒ error de compilación), cargados **solo en servidor**; los Client Components reciben únicamente las claves que usan.
  - `Intl` para precios (USD formateado por locale), fechas, números, plurales (`Intl.PluralRules`) y listas; sin `if`s manuales para plurales.
  - Routing `[locale]` con prefijo en todas las rutas públicas; `generateStaticParams` por locale; `lang`/`dir` en `<html>`.
  - `proxy.ts`: negociación para `/` → cookie → `Accept-Language` → default. Nunca redirigir crawlers por IP. (No hay lógica de auth en `proxy.ts`.)
  - Selector de idioma que lleva a **la misma página en el otro idioma** (slugs localizados, variante y filtros preservados).
  - Estrategia de fallback de contenido documentada (ADR).
  - **No agregues `pt`.** Escribí en el README el procedimiento paso a paso para agregarlo (config de locales + diccionario + datos de contenido) y verificá —con una prueba que no deje residuos en el repo— que **ninguna página ni componente** referencia locales concretos. Rutas, sitemap, hreflang, `llms.txt`, JSON-LD y selector deben derivarse de la config.
- **R02 Data layer**: cliente Mongo singleton (dev con `globalThis`, prod), pool configurado y justificado; repositorios por agregado devolviendo **tipos de dominio**; índices mínimos de la §6 de la letra; **índice Atlas Search** (§3.3); descuento de stock **atómico** (`updateOne` con `available >= qty` o transacción justificada); test de concurrencia (50 compras del último SKU ⇒ exactamente 1 exitosa).
- **R03 Redis**: capa propia (§3.2) con timeouts, breaker, y las 6 responsabilidades de la letra; modo degradado definido y testeado (Redis caído); documento de claves/TTL/serialización y por qué.
- **Seed reproducible** (`db:seed`): catálogo ES/EN (200–500 productos, 3–5 categorías con subcategorías, 2–6 colores, 3–8 talles), **imágenes locales por variante** (generá placeholders/SVG o imágenes locales livianas; una por color como mínimo), stock variado incluyendo SKUs en 0 y al menos un `discontinued`, `Redirect` de ejemplo. Idempotente y determinístico (semilla fija).
- Ajustes de contrato por exclusión de R18 (§1.2) en un ADR.

### Fase 2 — Caché, multi-instancia y observabilidad
- **R20**: perfiles `cacheLife` con nombre de negocio (`catalog`, `stock`, `editorial`...), convención de tags (`product:{id}`, `category:{id}`, `stock:{sku}`, `locale:{l}`) documentada, L1+L2, dedupe por request (`React.cache`), anti-stampede, `Cache-Control` coherente.
- **R04**: `Dockerfile` multi-stage de la app y compose con **≥ 3 instancias de la misma build** conectadas al Redis y a Mongo/Atlas ya configurados en `.env.local` (§3.7; sin levantar nuevos servicios de datos), y una entrada de tráfico a elección (nginx/traefik/caddy; ADR con trade-offs). Compartir `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`, `deploymentId`/build id, `cacheHandlers`. Header `x-instance-id`. Decidir y documentar la caché de imágenes (por instancia / volumen / CDN). Test e2e que recorre el journey **forzando instancias distintas** por request y otro que **mata una instancia en medio del checkout**.
- **R05**: `Server-Timing` (db, redis, cache hit/miss/stale), logs estructurados (instancia, ruta, locale, request id), registro visible de tags invalidados (con timestamp).
- Completar el diagrama de §5.2 de la letra (clave, TTL, invalidación y falla de cada capa) en `docs/caching.md`.

### Fase 3 — Commerce
Orden sugerido: R14 → R13 → R11 → R12 → R10 → R15 → R16 → R17 → R21 → R22 → R19.
- **R19 matriz de rendering** (entregable `docs/rendering-matrix.md`): completar la tabla de la letra y verificar que **`next build` coincide**. Ninguna ruta pública 100 % dinámica sin justificación. Cookies/headers se leen **fuera** de lo cacheado y se pasan como argumento. Sin waterfalls evitables.
- **R14 PDP**: variante en la URL (decidí segmento o search param y canonical → ADR), galería por variante, selector color/talle accesible, disponibilidad dinámica, descripción cacheada, relacionados con su propio `Suspense`/error boundary, pre-generación de PDPs principales por locale (`generateStaticParams`), estados agotado/variante agotada/`discontinued` (política R32). Stock nunca más viejo que el máximo aceptable (documentado). LCP = imagen principal con prioridad.
- **R13 ProductCard**: mayormente Server Component; isla cliente mínima para swatches, medida y justificada; sin JS cada swatch es un link; arranca en la variante del filtro de color activo; indica swatches sin stock; precarga en hover/focus; **CLS = 0**; accesible (grupo anunciado, nombre del color).
- **R11 PLP**: estado 100 % en URL, URL **canónica y estable** (orden de parámetros normalizado, mismo filtro ⇒ misma URL), funcional **sin JS** (`next/form`, mejora con `useTransition`/`useOptimistic`), búsqueda y orden, conteos de Atlas Search, opciones vacías deshabilitadas.
- **R12**: alternancia paginación/scroll infinito apoyada en `?page=n` reales, fallback "Cargar más" sin JS, restauración de posición y páginas al volver de PDP, prefetch moderado, límite de nodos en DOM, persistencia de preferencia (cookie/URL/storage → ADR), reset predecible al cambiar filtros.
- **R10 Home**: shell estático (hero + categorías en el HTML inicial sin JS), carrusel "novedades", "últimas unidades" en `Suspense` propio con skeleton.
- **R15 Carrito (solo invitado)**: Redis + cookie `httpOnly`/`Secure`/`SameSite`; mini-cart (drawer con `<dialog>`/popover) y página; Server Actions + UI optimista con rollback; validación en servidor contra precio/stock vigentes con aviso de cambio; el precio **nunca** viaja del cliente como fuente de verdad; el contador del header es un agujero dinámico en el shell estático (no rompe la caché de páginas públicas). *Sin merge al loguear.*
- **R16 Checkout**: pasos Contacto → Envío → Entrega → Pago → Revisión con URL propia; estado en Redis; guardas e redirección al paso correcto; esquemas de validación compartidos (p. ej. Zod/Valibot, justificar peso); errores por campo accesibles; funciona **sin JS**, mejora con `useActionState`/`useFormStatus`; gateway fake (aprobado/rechazado/timeout); **confirmación idempotente** (idempotency key generada *antes* de mostrar el botón; lock en Redis; índice único en Mongo) con descuento atómico; estado de la máquina según el diagrama de la letra. *Sin datos precargados de usuario.*
- **R17 Confirmación**: `orderId` + `accessToken`; sin token correcto ⇒ **404** (no 403); dinámica, privada, `noindex`; vacía el carrito y cierra el checkout; refrescar no crea nada.
- **R21 Suspense/skeletons**: límites por prioridad de contenido, skeletons con dimensiones **idénticas** (mismos tokens/layout), tema claro/oscuro y reduced-motion, `loading.tsx` donde corresponda, orden de revelado controlado. CLS < 0.1 con red lenta simulada. Documentá por qué cada límite está donde está.
- **R22 Errores**: `error.tsx`, `global-error.tsx`, `not-found.tsx` localizados con status HTTP correcto; errores parciales (falla "relacionados" ⇒ el resto vive); estados vacíos diseñados; reintento en UI.
- **R09 a11y** transversal: teclado completo, foco gestionado en cambios de ruta/modales/pasos, errores asociados a campos, contraste AA en ambos temas, auditoría automática (axe vía Playwright) sin críticos en Home/PLP/PDP/checkout.

### Fase 4 — SEO
- **R27** `generateMetadata` en todas las rutas públicas (template en layout, `metadataBase`, URLs absolutas), **canonical** según política escrita (p. ej. página 3 canonicaliza a sí misma), **hreflang recíproco + `x-default`** con slugs localizados (verificación automática), OG/Twitter.
- **R28** `robots.ts` (con sitemap; bloquea carrito, checkout, confirmación, `/api`, internos y facetas sin valor), **política de facetas** (qué es indexable, qué `noindex,follow`, qué no se enlaza) con tabla URL → resultado esperado en el README, búsqueda interna `noindex`, reglas para crawlers de IA (ADR). Recordá: `robots.txt` bloquea rastreo, no indexación; no bloquees lo que necesita ver su `noindex`. Tests de `meta robots` y canonical sobre un set de URLs.
- **R29** sitemap index + sitemaps por tipo/idioma (con alternates), `lastmod` real desde `updatedAt`, solo URLs canónicas/indexables/200, imágenes de producto, generados a demanda con caché invalidada por tag, paginables; `discontinued`/`draft` excluidos; validación contra el esquema.
- **R30** JSON-LD tipado (`schema-dts` o tipos propios): `Organization`, `WebSite`+`SearchAction`, `BreadcrumbList`, `ItemList` (PLP), `ProductGroup` + `hasVariant` + `variesBy` + `Offer` (precio, moneda, disponibilidad, url de variante); generado desde los mismos datos que la UI; escapar `<` al serializar; `availability` cambia con el stock.
- **R31** `/llms.txt` (formato llmstxt.org), por idioma o con secciones por idioma (ADR), links absolutos/canónicos, generado desde datos, cacheado e invalidado con el catálogo; opcional `/llms-full.txt`.
- **R32** 404 real (no soft 404), 301/308 desde `Redirect` (resolución eficiente, p. ej. en `proxy.ts` con consulta cacheada/Redis o Bloom/Set en Redis), política de `discontinued` justificada (410 / redirect / página viva), normalización de barra final, mayúsculas y parámetros basura; tests de status y `Location`.
- **R33** imágenes OG dinámicas por PDP/PLP (producto/categoría, precio, marca), localizadas y cacheadas.

### Fase 5 — Performance y transiciones
- **R23** View Transitions (API del navegador y/o `<ViewTransition>` según versión), elemento compartido imagen tarjeta → imagen PDP (estrategia de `view-transition-name` único por tarjeta), dirección distinta en checkout, microinteracciones (agregar al carrito, mini-cart, cambio de variante), duraciones/curvas desde tokens, desactivado con `prefers-reduced-motion`, degradación sin soporte. Medir que no afectan INP/CLS.
- **R34** paquetes internos ESM con `exports` por subpath y `sideEffects` correcto (¡ojo: `"sideEffects": false` puede descartar los estilos de SCSS Modules; declará bien los patrones `*.scss`/`*.css`!), sin barrels que arrastren código, iconos importables uno a uno, `server-only`/`client-only`, `dynamic()` para lo pesado, `Intl` en lugar de librerías, **presupuestos de First Load JS por ruta chequeados en CI** (superar ⇒ falla), evidencia **antes/después** de ≥ 3 optimizaciones (analizador de bundles de Turbopack o `source-map-explorer`) y ≥ 1 caso documentado de "esto rompía el tree shaking".
- **R35** objetivos p75 mobile: LCP < 2.5 s, INP < 200 ms, CLS < 0.1 en Home/PLP/PDP; Lighthouse CI en ambos idiomas con comparación contra corrida anterior; RUM con `useReportWebVitals`/`web-vitals` a un endpoint propio + reporte simple.
- **R36** `next/image` con `sizes` correctos, `priority`/`fetchPriority` solo en el LCP real, placeholders por variante, `next/font` con subset/`display` justificado/fallback ajustado; verificación de que ninguna imagen se descarga más grande de lo mostrado.

### Fase 6 — Calidad, seguridad y cierre
- **R37** `QUALITY.md`: definí qué es calidad para NUDO (criterios, qué se automatiza vs. revisa, qué se testea y por qué, qué *no* se testea) y asegurá que **el repo cumple lo que declara**, con evidencia. Coherencia y profundidad son lo evaluado.
- **R38** headers de seguridad + **CSP** (nonce vs hashes vs sin inline → ADR, con la consecuencia de que el nonce vuelve dinámica la página), validación de toda entrada en servidor, Server Actions tratadas como endpoints públicos (validación + rate limit; sin auth de usuario, pero sí el secreto del handler interno), cookies correctas, secretos solo en servidor, `npm audit`/equivalente sin críticos; tests de que modificar el precio desde el cliente no tiene efecto y de que el rate limit de "Confirmar pedido" funciona.
- README final: arranque local (Docker), variables de entorno, comandos, procedimiento para agregar un idioma, política de indexación, cómo correr tests/evidencias, cómo desplegar en Vercel (ver §5).

---

## 5. Despliegue en Vercel (preparación, no bloqueante)

El objetivo principal corre con Docker multi-instancia. Dejá el proyecto **listo** para Vercel sin romper el modo Docker:

- Variables de entorno separadas por entorno, **con los mismos nombres** (`MONGODB_URI`, `REDIS_URL`): en Vercel se cargan en el panel del proyecto y `.env.local` no se usa. Si la integración de Redis de Vercel inyecta otros nombres (p. ej. `KV_URL`), el adaptador debe mapearlos a `REDIS_URL` sin cambiar el resto del código (verificá los nombres vigentes en la documentación). `REDIS_DRIVER` y `CACHE_L1_PUBSUB=false` en Vercel.
- Confirmar que el `cacheHandlers` y el adaptador Redis funcionan en funciones serverless (conexiones reutilizadas, sin depender de procesos largos).
- Imágenes: usar el optimizador de Vercel (ADR sobre la diferencia con el modo Docker).
- Documentar en `docs/deploy-vercel.md` qué difiere del entorno Docker (sin multi-instancia controlada, sin pub/sub L1, headers `x-instance-id` no representativos) y qué requerimientos solo se demuestran en Docker (R04).

---

## 6. ADRs mínimos esperados

001 versión de Next/React, gestor de paquetes y Turbopack · 002 Atomic Design sin catálogo y mapa de diseño/tokens · 003 monorepo con workspaces + Turbopack: migración, `turbopack.root`, paquetes internos, Sass (§3.1 y §3.8) · 004 contrato de datos sin usuarios (§1.2) · 005 cliente Redis, timeouts y modo degradado · 006 estrategia de caché multinivel + pub/sub L1 (y su desactivación en Vercel) · 007 entrada de tráfico/balanceo · 008 caché de imágenes · 009 modelo de búsqueda/facetas y denormalización de `inStock` · 010 URL de variante y canonical de variantes · 011 preferencia paginación/scroll infinito · 012 política de facetas indexables · 013 política `discontinued` · 014 CSP · 015 fallback de contenido i18n · 016 crawlers de IA · 017 herramienta interna de invalidación (§3.4) · 018 librería de validación y otras dependencias de cliente justificadas.

---

## 7. Definición de "hecho" (por requerimiento)

Un requerimiento está hecho solo si: (1) cumple todos sus ítems de **Aceptación** de la letra, (2) hay test o script reproducible que lo demuestra (o evidencia medida en `docs/evidence/`), (3) no rompe fronteras, lint, tipos ni build, (4) está reflejado en `PROGRESS.md`, y (5) las decisiones relevantes tienen ADR. Si algo queda parcial, decilo explícitamente en `PROGRESS.md`; **no lo marques como cumplido**.

## 8. Qué NO hacer

- No generar Storybook ni catálogo de componentes, no implementar R18 y no agregar `pt`. **Sí** mantener Atomic Design y todas las variantes/estados de los componentes (§3.5).
- No usar otro framework de test que no sea Playwright (§3.6).
- No inventar paleta ni tipografía: salen de `docs/templates/`. No importar ni servir esos HTML desde la app.
- No introducir Tailwind, CSS-in-JS runtime ni librerías de componentes con estilos.
- No guardar precio/stock como fuente de verdad en el cliente.
- No poner datos privados (carrito, checkout, confirmación) en cachés compartidas.
- No usar `@import` en Sass ni valores visuales fuera de tokens.
- No cambiar versiones mayores de dependencias ni la versión de Next sin consultar.
- No marcar como hecho lo que no se verificó.