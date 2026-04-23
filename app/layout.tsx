import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fennec",
  description: "Tu negocio musical, en orden.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="h-full">{children}</body>
    </html>
  );
}