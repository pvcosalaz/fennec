// components/network/NetworkSection.tsx
"use client";

import { useEffect, useState } from "react";
import NetworkCollection from "./NetworkCollection";
import { getNetworkContacts } from "@/lib/networkDb";
import type { Profile } from "@/lib/communityTypes";

type Props = {
  userId: string;
};

export default function NetworkSection({ userId }: Props) {
  const [contacts, setContacts] = useState<Profile[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);

  useEffect(() => {
    setLoadingContacts(true);
    getNetworkContacts(userId)
      .then(setContacts)
      .finally(() => setLoadingContacts(false));
  }, [userId]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-semibold tracking-[0.35em] text-zinc-400 uppercase">Tu Red</p>
        <p className="mt-1 text-xs text-zinc-600">Productores en tu colección.</p>
      </div>
      {loadingContacts ? (
        <p className="text-xs text-zinc-600">Cargando red...</p>
      ) : (
        <NetworkCollection contacts={contacts} />
      )}
    </div>
  );
}
