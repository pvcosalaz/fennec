"use client";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Scanner } from "@yudiel/react-qr-scanner";
import { mintConnectionToken, redeemConnectionToken } from "@/lib/networkDb";
import { useSheetDismiss, SHEET_BOTTOM, SHEET_ENTER } from "@/components/ui/useSheetDismiss";
import type { Profile } from "@/lib/communityTypes";

/* The handshake — camera + your own dynamic QR at the same time. Two
   producers scan each other and both cards land in both decks instantly.
   Token refreshes every ~55s so it never goes stale mid-scan. */

const AMBER = "#f5a623";

export default function ScanSheet({
  onClose,
  onConnected,
}: {
  onClose: () => void;
  onConnected: (peer: Profile) => void;
}) {
  const { sheetRef, dismiss } = useSheetDismiss(onClose);
  const [qr, setQr] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    let alive = true;
    const mint = async () => {
      const token = await mintConnectionToken();
      if (!alive) return;
      if (!token) { setStatus("Couldn't generate your code — try again in a moment."); return; }
      const dataUrl = await QRCode.toDataURL(token, { margin: 1, width: 220, color: { dark: "#111114", light: "#ffffff" } });
      if (alive) setQr(dataUrl);
    };
    mint();
    const id = setInterval(mint, 55_000); // refresh before the ~60s token expires
    return () => { alive = false; clearInterval(id); };
  }, []);

  async function handleScan(codes: { rawValue: string }[]) {
    const raw = codes[0]?.rawValue?.trim();
    if (busyRef.current || !raw) return;
    busyRef.current = true;
    setStatus("Connecting…");

    const res = await redeemConnectionToken(raw);
    if (res.ok) {
      navigator.vibrate?.(10);
      onConnected(res.peer);
      dismiss();
    } else {
      setStatus(prettyReason(res.reason));
      setTimeout(() => { busyRef.current = false; setStatus(null); }, 1600);
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm"
        style={{ animation: "sheetFadeIn .25s ease both" }}
        onClick={dismiss}
      />
      <div
        ref={sheetRef}
        className="fixed inset-x-0 z-[70] mx-auto w-full max-w-md rounded-t-3xl border-t border-white/10 px-6 pt-3 pb-8"
        style={{ bottom: SHEET_BOTTOM, background: "#131216", animation: SHEET_ENTER }}
      >
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        <p className="text-center text-sm font-bold text-white mb-1">Trade cards</p>
        <p className="text-center text-[11px] text-zinc-500 mb-5">
          Scan each other in person — both cards join both decks at once.
        </p>

        {qr ? (
          <img
            src={qr}
            alt="Your connect code — have the other producer scan this"
            className="mx-auto rounded-xl mb-5"
            width={180}
            height={180}
          />
        ) : (
          <div className="mx-auto mb-5 w-[180px] h-[180px] rounded-xl bg-white/5 animate-pulse" />
        )}

        <div className="rounded-2xl overflow-hidden aspect-square max-w-[240px] mx-auto border border-white/10">
          <Scanner
            onScan={handleScan}
            components={{ finder: false, torch: false, onOff: false, zoom: false }}
            constraints={{ facingMode: "environment" }}
          />
        </div>

        {status && (
          <p className="text-center text-[12px] mt-4" style={{ color: AMBER }}>
            {status}
          </p>
        )}
      </div>
    </>
  );
}

function prettyReason(reason: string): string {
  if (reason.includes("TOKEN_EXPIRED")) return "That code expired — ask them to reopen Scan.";
  if (reason.includes("TOKEN_USED")) return "Already connected.";
  if (reason.includes("CANNOT_CONNECT_SELF")) return "That's your own code.";
  if (reason.includes("TOKEN_NOT_FOUND")) return "Code not recognized — try again.";
  return "Couldn't connect — try again.";
}
