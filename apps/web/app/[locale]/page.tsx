import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { isLocale } from "@nudo/i18n/config";
import { getDictionary } from "@nudo/i18n/dictionaries";
import { ButtonLink } from "@nudo/ui/atoms/Button";
import { Skeleton } from "@nudo/ui/atoms/Skeleton";
import { getCategories } from "../../lib/catalog";
import { NewArrivals } from "./_components/NewArrivals";
import { LastUnits } from "./_components/LastUnits";
import styles from "./page.module.scss";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getDictionary(locale);
  return { description: t.meta.description };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [t, categories] = await Promise.all([getDictionary(locale), getCategories()]);
  const roots = categories.filter((c) => !c.parentId);

  return (
    <div className={styles.home}>
      {/* Hero estático: forma parte del HTML inicial sin JS (R10). */}
      <section className={styles.hero}>
        <p className={styles.kicker}>{t.meta.siteName}</p>
        <h1>{t.home.hero.title}</h1>
        <p className={styles.subtitle}>{t.home.hero.subtitle}</p>
        <ButtonLink href={`/${locale}/search`} variant="primary">
          {t.home.hero.cta}
        </ButtonLink>
      </section>

      <section aria-labelledby="cat-title" className={styles.section}>
        <h2 id="cat-title">{t.home.categoriesTitle}</h2>
        <ul className={styles.cats}>
          {roots.map((category) => (
            <li key={category.id}>
              <Link href={`/${locale}/c/${category.slug[locale]}`} className={styles.cat}>
                {category.name[locale]}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Novedades: 100 % `use cache` ⇒ forma parte del shell estático (visible
          en el HTML inicial aun sin JavaScript). */}
      <NewArrivals locale={locale} t={t} />

      {/* Últimas unidades: depende de stock (perfil `stock`, 30 s). Skeleton propio,
          nunca bloquea el resto de la página (R10/R21). */}
      <Suspense fallback={<GridSkeleton label={t.home.lastUnits} />}>
        <LastUnits locale={locale} t={t} />
      </Suspense>
    </div>
  );
}

function GridSkeleton({ label }: { label: string }) {
  return (
    <section className={styles.section} aria-label={label} aria-busy="true">
      <h2>{label}</h2>
      <ul className={styles.skelGrid}>
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i}>
            <Skeleton height="100%" />
          </li>
        ))}
      </ul>
    </section>
  );
}
