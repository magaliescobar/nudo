import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { notFound } from "next/navigation";
import { dirOf, isLocale, locales, type Locale } from "@nudo/i18n/config";
import { getDictionary } from "@nudo/i18n/dictionaries";
import { Header } from "@nudo/ui/organisms/Header";
import { Footer } from "@nudo/ui/organisms/Footer";
import { LocaleSwitcher } from "@nudo/ui/molecules/LocaleSwitcher";
import "@nudo/tokens/css";
import { siteUrl } from "../../lib/seo";
import { JsonLd, organizationJsonLd, webSiteJsonLd } from "../../lib/jsonld";
import "../globals.scss";
import { CartDrawer } from "./_components/CartDrawer";
import { WebVitals } from "./_components/WebVitals";

// Archivo variable (peso + ancho) como en el catálogo; next/font genera el fallback métrico (R36).
const archivo = Archivo({
  subsets: ["latin", "latin-ext"],
  axes: ["wdth"],
  display: "swap",
  variable: "--font-archivo",
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getDictionary(locale);
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: t.meta.siteName, template: `%s · ${t.meta.siteName}` },
    description: t.meta.description,
    openGraph: {
      siteName: t.meta.siteName,
      locale,
      type: "website",
    },
    twitter: { card: "summary_large_image" },
  };
}

function localeOptions(locale: Locale) {
  return locales.map((l) => ({
    locale: l,
    label: l.toUpperCase(),
    href: `/${l}`,
    current: l === locale,
  }));
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = await getDictionary(locale);

  return (
    <html lang={locale} dir={dirOf(locale)} className={archivo.variable}>
      <body>
        {/* R30: Organization + WebSite en todas las páginas del locale. */}
        <JsonLd data={organizationJsonLd(t.meta.siteName)} />
        <JsonLd data={webSiteJsonLd(locale, t.meta.siteName)} />
        <Header
          siteName={t.meta.siteName}
          nav={{
            shop: t.nav.shop,
            cart: t.nav.cart,
            help: t.nav.help,
            skipToContent: t.nav.skipToContent,
            search: t.nav.search,
          }}
          localeLabel={t.locale.label}
          cartHref={`/${locale}/cart`}
          shopHref={`/${locale}`}
          searchHref={`/${locale}/search`}
          helpHref={`/${locale}/search`}
          end={<LocaleSwitcher options={localeOptions(locale)} label={t.locale.label} />}
          cartBadge={<CartDrawer locale={locale} />}
        />
        <main id="contenido">{children}</main>
        <WebVitals />
        <Footer
          siteName={t.meta.siteName}
          tagline={t.footer.tagline}
          shopLabel={t.footer.shop}
          helpLabel={t.footer.help}
          legal={t.footer.legal}
          shopHref={`/${locale}`}
          helpHref={`/${locale}/search`}
        />
      </body>
    </html>
  );
}
