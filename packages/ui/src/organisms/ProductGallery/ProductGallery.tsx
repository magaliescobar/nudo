// Galería del PDP (R14): imagen principal + thumbs. Server Component;
// los thumbs son links ?img=n (funciona sin JS) y con JS la galería es una
// isla cliente (ProductGalleryClient) para crossfade sin reload.
import Image from "next/image";
import { blurDataURLFromHex } from "../../utils/placeholder";
import Link from "next/link";
import styles from "./ProductGallery.module.scss";

export type GalleryImage = {
  readonly src: string;
  readonly alt: string;
  readonly width: number;
  readonly height: number;
  /** Hex del color de la variante → placeholder (R36). */
  readonly blurHex?: string;
};

type ProductGalleryProps = {
  images: readonly GalleryImage[];
  /** Índice activo (0-based) para SSR/no-JS. */
  activeIndex: number;
  /** href para cada thumb (?img=n) preservando variante. */
  hrefFor: (index: number) => string;
  labels: { gallery: string; imageOf: string };
};

export function ProductGallery({ images, activeIndex, hrefFor, labels }: ProductGalleryProps) {
  const active = images[activeIndex] ?? images[0];
  if (!active) return null;

  return (
    <div className={styles.gallery}>
      <div className={styles.main}>
        <Image
          key={active.src}
          src={active.src}
          alt={`${active.alt} (${activeIndex + 1} ${labels.imageOf} ${images.length})`}
          width={active.width}
          height={active.height}
          sizes="(min-width: 60rem) 45vw, 100vw"
          priority
          placeholder="blur"
          blurDataURL={blurDataURLFromHex(active.blurHex ?? "#E9E4D8")}
        />
      </div>
      {images.length > 1 && (
        <ul className={styles.thumbs} aria-label={labels.gallery}>
          {images.map((image, index) => (
            <li key={image.src}>
              <Link
                href={hrefFor(index)}
                scroll={false}
                aria-current={index === activeIndex ? true : undefined}
                aria-label={`${labels.imageOf} ${index + 1}`}
              >
                <Image
                  src={image.src}
                  alt=""
                  width={image.width}
                  height={image.height}
                  sizes="80px"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
