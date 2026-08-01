"use client";

// Dev-only. The pipeline strip lives in the DESKTOP hub, and the main
// /dev-ui gallery is a phone-width column that clips it — so the variants
// get their own full-width page. 404s in production.

import { notFound } from "next/navigation";
import {
  StripCurrent, StripMoneyJourney, StripKeepClients, StripCountsFirst, StripThree,
} from "@/components/business/PipelineStripVariants";

export default function StripVariantsPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <div className="min-h-screen bg-[#0b0a08] px-8 py-10">
      <div className="mx-auto w-full space-y-5" style={{ maxWidth: 1040 }}>
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-600">
          Pipeline strip · variants
        </p>
        <StripCurrent />
        <StripMoneyJourney />
        <StripKeepClients />
        <StripCountsFirst />
        <StripThree />
      </div>
    </div>
  );
}
