import { ImageResponse } from "next/og";
import { getDictionary } from "@nudo/i18n/dictionaries";
import { isLocale } from "@nudo/i18n/config";
import { resolveCategoryPath } from "../../../../../lib/categories";
import { siteUrl } from "../../../../../lib/seo";
import { darkColor } from "../../../../../lib/og-theme";

// R33: OG image dinámica de la PLP de categoría. La convención
// `opengraph-image.tsx` no admite catch-all, así que es route handler y el
// `generateMetadata` de la PLP apunta su og:image acá. `use cache` (vía
// getCategories/resolveCategoryPath) + tag catalog: cacheada por path.
// Estilos inline: ImageResponse usa Satori (JSX→SVG→PNG), que no procesa CSS
// ni clases — solo el prop `style` con un subset. Los colores salen de los
// tokens (tema oscuro) via lib/og-theme, no hardcodeados.
export const size = { width: 1200, height: 630 };

type Props = { params: Promise<{ locale: string; slug: string[] }> };

export async function GET(_req: Request, { params }: Props) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return new Response("Not Found", { status: 404 });
  const [t, resolved] = await Promise.all([
    getDictionary(locale),
    resolveCategoryPath(locale, slug),
  ]);
  if (!resolved) return new Response("Not Found", { status: 404 });
  const category = resolved.category;

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        padding: 64,
        background: darkColor("color-surface"),
        color: darkColor("color-text-primary"),
        fontFamily: "sans-serif",
      }}
    >
      <span style={{ fontSize: 36, fontWeight: 700, letterSpacing: 8 }}>{t.meta.siteName}</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <span style={{ fontSize: 28, opacity: 0.7 }}>{t.nav.shop}</span>
        <span style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.1 }}>
          {category.name[locale]}
        </span>
      </div>
      <span style={{ fontSize: 28, opacity: 0.6 }}>
        {siteUrl().replace(/^https?:\/\//, "")}/{locale}/c/{resolved.canonicalSegments.join("/")}
      </span>
    </div>,
    size,
  );
}
