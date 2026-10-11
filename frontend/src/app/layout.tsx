import type { Metadata, Viewport } from "next";
import { Sora, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
  weight: ["400", "600", "700"],
});

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
  weight: ["400", "500", "600"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500"],
});

export const viewport: Viewport = {
  themeColor: "#00030F",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://parikshit.dev"),
  title: "Parikshit – Grounded AI Engineering Teammate",
  description:
    "An AI engineering teammate that moves developers safely from unfamiliar codebases to verified changes: Understand → Change → Challenge → Verify → Prove.",
  icons: {
    icon: [
      { url: "/brand/favicon.ico", sizes: "any" },
      { url: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/brand/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "Parikshit – Grounded AI Engineering Teammate",
    description: "Understand. Change. Challenge. Verify. Prove. Grounded AI engineering with cryptographic proof-of-work.",
    url: "https://parikshit.dev",
    siteName: "Parikshit",
    images: [
      {
        url: "/brand/og-image.png",
        width: 1200,
        height: 630,
        alt: "Parikshit AI Engineering Teammate",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Parikshit – Grounded AI Engineering Teammate",
    description: "Understand. Change. Challenge. Verify. Prove.",
    images: ["/brand/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${sora.variable} ${instrumentSans.variable} ${jetbrainsMono.variable}`}
    >
      <body className="antialiased min-h-screen text-[var(--color-text-100)] bg-[var(--color-ink-950)] selection:bg-[var(--color-cyan-300)]/20 selection:text-[var(--color-cyan-300)]">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--color-ink-800)] focus:text-[var(--color-cyan-300)] focus:border focus:border-[var(--color-cyan-300)] focus:rounded-md focus:shadow-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-cyan-300)]"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
