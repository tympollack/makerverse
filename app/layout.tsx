// app/layout.tsx
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Makerverse",
  description:
    "Phygital craft commerce — NFC-provenance tracked maker goods with on-chain ownership.",
};

export const viewport = {
  themeColor: "#1A1A1A",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn(inter.variable, jetbrainsMono.variable)}>
      <body
        className={cn(
          "bg-[#1A1A1A] text-[#F9F9F9] min-h-screen",
          inter.className,
        )}
      >
        {children}
      </body>
    </html>
  );
}
