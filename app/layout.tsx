import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#111114",
};

export const metadata: Metadata = {
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // lang="en": the Fennec UI is English-only — with lang="es", VoiceOver
    // read every English string with Spanish pronunciation
    <html lang="en" className="h-full antialiased" style={{ background: "#111114" }}>
      <body className="h-full" style={{ background: "#111114" }}>{children}</body>
    </html>
  );
}