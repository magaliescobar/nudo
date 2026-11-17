import { notFound } from "next/navigation";
import { isLocale } from "@nudo/i18n/config";
import { getDictionary } from "@nudo/i18n/dictionaries";
import { VisuallyHidden } from "@nudo/ui/atoms/VisuallyHidden";
import styles from "./page.module.scss";

// Placeholder: la Home real (R10) llega en la Fase 3.
export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = await getDictionary(locale);

  return (
    <main className={styles.main}>
      <h1 className={styles.brand}>
        {t.meta.siteName}
        <VisuallyHidden> · {t.meta.tagline}</VisuallyHidden>
      </h1>
    </main>
  );
}
