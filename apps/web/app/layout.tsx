import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "@nudo/tokens/css";
import "./globals.scss";

// Archivo variable (peso + ancho) como en el catálogo; next/font genera el fallback métrico (R36).
const archivo = Archivo({
  subsets: ["latin", "latin-ext"],
  axes: ["wdth"],
  display: "swap",
  variable: "--font-archivo",
});

export const metadata: Metadata = {
  title: "NUDO",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={archivo.variable}>
      <body>{children}</body>
    </html>
  );
}
