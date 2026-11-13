import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { notFound } from "next/navigation";
import { dirOf, isLocale, locales } from "@nudo/i18n/config";
import { getDictionary } from "@nudo/i18n/dictionaries";
import "@nudo/tokens/css";
import "../globals.scss";

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
  return { title: { default: t.meta.siteName, template: `%s · ${t.meta.siteName}` } };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <html lang={locale} dir={dirOf(locale)} className={archivo.variable}>
      <body>{children}</body>
    </html>
  );
}
