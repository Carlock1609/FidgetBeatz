import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, JetBrains_Mono, Sora } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const sora = Sora({ variable: "--font-sora", subsets: ["latin"], weight: ["400", "600", "800"] });
const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: "500",
});
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: "500" });

export const metadata: Metadata = {
  title: "FidgetBeatz — When you fidget, make a beat",
  description:
    "Tap colorful sound pads, mix overlapping sounds and save your own soundboards. No account, no install.",
  applicationName: "FidgetBeatz",
};

export const viewport: Viewport = {
  themeColor: "#0b0b12",
  width: "device-width",
  initialScale: 1,
  // Pads must fill the screen edge to edge in focus mode; safe areas are handled in CSS.
  viewportFit: "cover",
};

/** Root layout: fonts and the dark stage. Server Component. */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${sora.variable} ${jetbrains.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="h-full overflow-hidden">{children}</body>
    </html>
  );
}
