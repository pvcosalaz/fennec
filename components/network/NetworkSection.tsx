// components/network/NetworkSection.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { QrCode } from "lucide-react";
import NetworkCollection from "./NetworkCollection";
import ScanSheet from "./ScanSheet";
import { getNetworkContacts } from "@/lib/networkDb";
import type { Profile } from "@/lib/communityTypes";

type Props = {
  userId: string;
};

export default function NetworkSection({ userId }: Props) {
  const [contacts, setContacts] = useState<Profile[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [showScan, setShowScan] = useState(false);

  const reload = useCallback(() => {
    setLoadingContacts(true);
    getNetworkContacts(userId)
      .then(setContacts)
      .finally(() => setLoadingContacts(false));
  }, [userId]);

  useEffect(() => { reload(); }, [reload]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.35em] text-zinc-400 uppercase">Your Network</p>
          <p className="mt-1 text-xs text-zinc-600">Producers in your collection.</p>
        </div>
        <button
          onClick={() => setShowScan(true)}
          className="flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-[11px] font-bold text-accent transition hover:bg-accent/20 active:scale-95"
        >
          <QrCode className="h-3.5 w-3.5" />
          Scan
        </button>
      </div>
      {loadingContacts ? (
        <p className="text-xs text-zinc-600">Loading network...</p>
      ) : (
        <NetworkCollection contacts={contacts} onScanClick={() => setShowScan(true)} />
      )}
      {showScan && (
        <ScanSheet
          onClose={() => setShowScan(false)}
          onConnected={() => { setShowScan(false); reload(); }}
        />
      )}
    </div>
  );
}
