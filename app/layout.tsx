import type { Metadata } from "next";
import { Anybody, Courier_Prime } from "next/font/google";
import "./globals.css";

// Display: "Anybody" — sustituto variable, ancho y agresivo, para roles de titular.
const anybody = Anybody({
  variable: "--font-anybody",
  subsets: ["latin"],
  display: "swap",
});

// Cuerpo y datos técnicos: "Courier Prime" (monoespaciada, no variable).
const courierPrime = Courier_Prime({
  variable: "--font-courier-prime",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Arcade Vault",
  description:
    "Juega online y compite por la mayor cantidad de puntos en el Salón de la Fama.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${anybody.variable} ${courierPrime.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
