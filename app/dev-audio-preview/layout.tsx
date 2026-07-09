import { notFound } from "next/navigation";

/** Design/QA previews with fake seed data — dev-only. In production builds
 *  every /dev-audio-preview route 404s so reviewers and curious users never see
 *  placeholder content under the brand. */
export default function DevAudioPreviewLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound();
  return <>{children}</>;
}
