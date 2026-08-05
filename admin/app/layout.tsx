import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Serif de display solo para cifras y títulos: le da el aire editorial que
// pide un congreso académico sin sacrificar legibilidad en el resto.
const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Verificación de inscripciones · Congreso",
  description: "Panel interno para revisar inscripciones y comprobantes de pago.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
