import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  // Matches the root canvas in globals.css — NOT --background. This tints the
  // OS chrome (Android status bar, iOS standalone edges); gray #111114 here is
  // what made the bottom home-indicator band read as a foreign gray block.
  themeColor: "#0b0a08",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://app.fennec.audio"),
  title: "Fennec",
  description: "Your music business, organized.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Fennec",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
  // Share card (no image before → chat apps showed a floating transparent fox).
  openGraph: {
    type: "website",
    siteName: "Fennec",
    title: "Fennec: Run your music like a business.",
    description: "The music business & community hub for producers and composers.",
    url: "https://app.fennec.audio",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Fennec — run your music like a business." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fennec: Run your music like a business.",
    description: "The music business & community hub for producers and composers.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // lang="en": the Fennec UI is English-only. With lang="es", VoiceOver read
  // every English string with a Spanish accent.
  return (
    <html lang="en" className="h-full antialiased" style={{ background: "#0b0a08" }}>
      <body className="h-full" style={{ background: "#0b0a08" }}>{children}</body>
    </html>
  );
}