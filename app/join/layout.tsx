import type { Metadata } from "next";

const title = "Únete a la waitlist de Fennec";
const description = "La app que centraliza el negocio del productor musical. Sé el primero en enterarte del lanzamiento.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    type: "website",
    images: [{ url: "/fennec-logo.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/fennec-logo.png"],
  },
};

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return children;
}
