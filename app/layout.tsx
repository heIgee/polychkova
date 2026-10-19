import type { Metadata } from "next";
import { Archivo_Black, Inter } from "next/font/google";
import { siteOrigin } from "@/lib/site";
import "./globals.css";

const displayFont = Archivo_Black({
  variable: "--font-heading",
  weight: "400",
  subsets: ["latin"],
});

const bodyFont = Inter({
  variable: "--font-copy",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: siteOrigin(),
  title: {
    default: "Polychkova",
    template: "%s | Polychkova",
  },
  description: "Build live tier lists and rank anything with your friends.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${displayFont.variable} ${bodyFont.variable}`}>{children}</body>
    </html>
  );
}
