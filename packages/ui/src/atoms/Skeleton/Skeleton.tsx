// Server Component: bloque de skeleton con shimmer (tokens de skeleton).
// Las dimensiones vienen del layout real del componente que reemplaza (R21).
import type { CSSProperties } from "react";
import styles from "./Skeleton.module.scss";

type SkeletonProps = {
  width?: string;
  height?: string;
  className?: string;
  /** `true` = decorative; usar false solo si el skeleton comunica algo. */
  decorative?: boolean;
};

export function Skeleton({ width, height, className, decorative = true }: SkeletonProps) {
  const style: CSSProperties = {
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
  };
  return (
    <span
      className={[styles.skel, className].filter(Boolean).join(" ")}
      style={style}
      aria-hidden={decorative || undefined}
    />
  );
}
