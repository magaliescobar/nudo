# ADR 020 · URLs canónicas del catálogo: variantes en PDP y facetas en query

- Estado: aceptado (Fase 3)
- Requerimientos: R11, R13, R14; entregables § SEO

## Contexto

Hay que decidir dónde vive cada dimensión de la navegación: la variante elegida en la PDP, los filtros/facetas/búsqueda/orden/página en la PLP, y cómo se canonicaliza todo para SEO y para que la URL sea compartible sin JS.

## Decisión

**PDP** (`/{locale}/p/{slug}`):

- Una sola URL canónica por producto (`alternates.canonical = /{locale}/p/{slug[locale]}`). Las variantes **no** generan URLs propias: `?v=<variantId>&i=<imgIndex>` selecciona variante/imagen y es contenido de la misma página, no una página distinta. El slug viejo redirige 301 (herramienta interna, ADR 017).
- La variante por defecto es la primera con stock o `defaultVariantId`; un `?v=` inválido cae a la default sin error (no es un estado de recurso, es un parámetro de vista).

**PLP** (`/{locale}/c/{path...}` y `/{locale}/search`):

- Todo el estado de la lista vive en la query: `q`, `color`, `size`, `sort`, `page`, `view`, más la categoría en el path.
- Los valores multi-valor se serializan como CSV ordenado (`color=rojo,azul`) para que la URL sea estable y cacheable; el parser ordena antes de filtrar, así `?color=b,a` y `?color=a,b` producen la misma key de caché.
- `page=1` y parámetros vacíos se omiten del href canónico; el path de categoría no-canónico redirige al canónico (segmentos resueltos contra el árbol de categorías).
- Los enlaces de facetas son GET links normales (`FacetOption` con `aria-current` para el estado activo): funcionan sin JS y son rastreables.

## Consecuencias

- URLs compartibles y estables; la key de `use cache` de la PLP se deriva de los filtros ya normalizados.
- No hay canonicalización por variante: dos variantes del mismo producto comparten URL base, mitigado por `?v=` no indexable por diseño (mismo documento).
- Los filtros en query implican muchas combinaciones cacheables: el `expire` corto del perfil `catalog` acota el crecimiento de keys.
