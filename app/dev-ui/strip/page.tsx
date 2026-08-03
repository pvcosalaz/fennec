"use client";

/* Dev-only, 404s in production.

   Started as a board to pick the Pipeline strip's metrics; that's decided
   (the money's journey), so the variants are gone. What earns its keep is
   the quote form at full desktop width: the main /dev-ui gallery is a
   phone-width column, and this is the only way to exercise the real
   QuoteGenerator without a login.

   Needs a completed pricing setup to get past the form's gate. Paste this
   in the console, then reload:

     localStorage.setItem('fennec-pricing-v1', JSON.stringify({
       personalExpenses:{rent:"38000",food:"12000"}, studioExpenses:{gear:"9000"},
       taxPercent:"16", reinvestmentPercent:"10", emergencyFund:"5000",
       hoursPerWeek:"30", weeksPerMonth:"4", hoursPerProject:"24",
       setupCompleted:true }))
*/

import { notFound } from "next/navigation";
import QuoteGenerator from "@/components/business/QuoteGenerator";

export default function QuoteFormDevPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    /* globals.css locks `html` to overflow:hidden for the PWA shell, so a
       tall dev page clips instead of scrolling. */
    <div className="h-[100dvh] overflow-y-auto bg-[#0b0a08] px-8 py-10">
      <div className="mx-auto w-full space-y-5" style={{ maxWidth: 1040 }}>
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-600">
          Quote generator (real component)
        </p>
        <QuoteGenerator
          onBack={() => {}}
          onGoToProjects={() => {}}
          onGoToClients={() => {}}
          onGoToCalculator={() => {}}
          userId="00000000-0000-0000-0000-000000000000"
        />
      </div>
    </div>
  );
}
