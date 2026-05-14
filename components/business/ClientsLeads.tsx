"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft,
  UserPlus,
  Mail,
  Phone,
  Building2,
  Trash2,
  Pencil,
} from "lucide-react";
import { type Client } from "@/lib/pricingData";
import { getClients, upsertClient, deleteClient } from "@/lib/businessDb";
import { supabase } from "@/lib/supabase";

type Props = {
  onBack: () => void;
  userId: string;
};

const emptyForm = { name: "", email: "", phone: "", company: "" };

export default function ClientsLeads({ onBack, userId }: Props) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saved, setSaved] = useState(false);

  // Load from Supabase
  useEffect(() => {
    getClients(userId).then((data) => {
      setClients(data);
      setLoading(false);
    });
  }, [userId]);

  // Realtime sync — updates from other devices
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`business_clients:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'business_clients', filter: `user_id=eq.${userId}` },
        () => {
          getClients(userId).then(setClients);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const openAdd = () => {
    setForm(emptyForm);
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (client: Client) => {
    setForm({
      name: client.name,
      email: client.email,
      phone: client.phone,
      company: client.company,
    });
    setEditing(client);
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.email.trim()) return;

    if (editing) {
      const updated = { ...editing, ...form };
      // Optimistic update
      setClients((prev) => prev.map((c) => (c.id === editing.id ? updated : c)));
      upsertClient(userId, updated);
    } else {
      const newClient: Client = {
        id: crypto.randomUUID(),
        ...form,
        createdAt: Date.now(),
      };
      // Optimistic update
      setClients((prev) => [newClient, ...prev]);
      upsertClient(userId, newClient);
    }

    setShowForm(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDelete = (id: string) => {
    // Optimistic update
    setClients((prev) => prev.filter((c) => c.id !== id));
    deleteClient(userId, id);
  };

  const field = (key: keyof typeof emptyForm) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((p) => ({ ...p, [key]: e.target.value })),
  });

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4">
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-zinc-400 transition hover:text-accent"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Business
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold tracking-[0.3em] text-accent uppercase">
            Clients & Leads
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Your contacts.
          </h1>
          <p className="text-sm text-zinc-400">
            Prospects, clients, everyone you&apos;ve worked with.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110"
        >
          <UserPlus className="h-4 w-4" />
          Add client
        </button>
      </div>

      {/* Saved toast */}
      {saved && (
        <div className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-2 text-sm text-accent">
          ✓ Client saved
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-white">
            {editing ? "Edit client" : "New client"}
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-zinc-400">Name *</span>
              <input
                type="text"
                placeholder="Hernán García"
                className="h-10 rounded-xl border border-white/15 bg-black/30 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-accent"
                {...field("name")}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-zinc-400">Email *</span>
              <input
                type="email"
                placeholder="hernan@estudio.com"
                className="h-10 rounded-xl border border-white/15 bg-black/30 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-accent"
                {...field("email")}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-zinc-400">Phone</span>
              <input
                type="tel"
                placeholder="+52 55 1234 5678"
                className="h-10 rounded-xl border border-white/15 bg-black/30 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-accent"
                {...field("phone")}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-zinc-400">Company / Project</span>
              <input
                type="text"
                placeholder="Disquera XYZ"
                className="h-10 rounded-xl border border-white/15 bg-black/30 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-accent"
                {...field("company")}
              />
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button
              onClick={() => setShowForm(false)}
              className="rounded-xl border border-white/15 px-4 py-2 text-sm text-zinc-300 transition hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!form.name.trim() || !form.email.trim()}
              className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {editing ? "Save changes" : "Add client"}
            </button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && clients.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-16 text-center">
          <p className="text-sm text-zinc-500">No clients yet.</p>
          <p className="mt-1 text-xs text-zinc-600">
            Add your first contact to start sending quotes.
          </p>
        </div>
      )}

      {/* Client list */}
      {!loading && clients.length > 0 && (
        <div className="space-y-2">
          {clients.map((client) => (
            <div
              key={client.id}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4 transition hover:border-white/20"
            >
              {/* Avatar + info */}
              <div className="flex items-center gap-4 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-sm font-bold text-accent">
                  {client.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {client.name}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-3">
                    <span className="flex items-center gap-1 text-xs text-zinc-400">
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="truncate">{client.email}</span>
                    </span>
                    {client.phone && (
                      <span className="flex items-center gap-1 text-xs text-zinc-500">
                        <Phone className="h-3 w-3 shrink-0" />
                        {client.phone}
                      </span>
                    )}
                    {client.company && (
                      <span className="flex items-center gap-1 text-xs text-zinc-500">
                        <Building2 className="h-3 w-3 shrink-0" />
                        {client.company}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="ml-4 flex shrink-0 items-center gap-2">
                <button
                  onClick={() => openEdit(client)}
                  className="rounded-lg border border-white/10 p-1.5 text-zinc-400 transition hover:border-white/25 hover:text-white"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(client.id)}
                  className="rounded-lg border border-white/10 p-1.5 text-zinc-600 transition hover:border-red-400/30 hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
