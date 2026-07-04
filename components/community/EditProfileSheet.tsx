"use client";
import { useState, useRef } from "react";
import { X, Plus, ImagePlus } from "lucide-react";
import { updateProfile, uploadImage } from "@/lib/communityDb";
import type { Profile } from "@/lib/communityTypes";
import { useSheetDismiss, SHEET_BOTTOM, SHEET_ENTER } from "@/components/ui/useSheetDismiss";

type Props = {
  profile: Profile;
  onClose: () => void;
  onSaved: (updated: Profile) => void;
};

export default function EditProfileSheet({ profile, onClose, onSaved }: Props) {
  const { sheetRef, dismiss } = useSheetDismiss(onClose);
  const [bio, setBio]               = useState(profile.bio ?? "");
  const [genreInput, setGenreInput] = useState("");
  const [genres, setGenres]         = useState<string[]>(profile.genres ?? []);
  const [workedWith, setWorkedWith] = useState(profile.worked_with ?? "");
  const [workedIn, setWorkedIn]     = useState(profile.worked_in ?? "");
  const [bannerUrl, setBannerUrl]   = useState<string | null>(profile.banner_url ?? null);
  const [saving, setSaving]         = useState(false);
  const fileRef   = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  function addGenre() {
    const tag = genreInput.trim();
    if (!tag || genres.includes(tag)) { setGenreInput(""); return; }
    setGenres((g) => [...g, tag]);
    setGenreInput("");
  }

  function removeGenre(tag: string) {
    setGenres((g) => g.filter((t) => t !== tag));
  }

  async function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);
    try {
      const url = await uploadImage(file);
      const updated = await updateProfile(profile.id, { avatar_url: url });
      onSaved(updated);
    } finally {
      setSaving(false);
    }
  }

  async function handleBannerSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);
    try {
      const url = await uploadImage(file);
      setBannerUrl(url);
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await updateProfile(profile.id, {
        bio:        bio.trim() || null,
        genres,
        worked_with: workedWith.trim() || null,
        worked_in:   workedIn.trim() || null,
        banner_url:  bannerUrl,
      });
      onSaved(updated);
      onClose();
    } catch (err) {
      console.error(err);
      alert("Error guardando. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" style={{ animation: "sheetFadeIn .25s ease both" }} onClick={dismiss} />
      <div
        ref={sheetRef}
        className="fixed left-0 right-0 z-50 rounded-t-3xl bg-zinc-950 border-t border-white/10 p-4 space-y-4 max-h-[85vh] overflow-y-auto"
        style={{ bottom: SHEET_BOTTOM, paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)", animation: SHEET_ENTER }}
      >

        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white">Edit profile</span>
          <button onClick={onClose}><X className="h-5 w-5 text-zinc-500" /></button>
        </div>

        {/* Banner */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Studio photo</label>
          <button
            onClick={() => bannerRef.current?.click()}
            className="relative w-full h-28 rounded-2xl overflow-hidden border border-white/10 bg-white/5 hover:border-amber-500 transition flex items-center justify-center"
          >
            {bannerUrl
              ? <img src={bannerUrl} className="w-full h-full object-cover" alt="" />
              : <div className="flex flex-col items-center gap-1.5 text-zinc-600">
                  <ImagePlus className="h-6 w-6" />
                  <span className="text-xs">Upload studio photo</span>
                </div>}
            {bannerUrl && (
              <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition flex items-center justify-center">
                <span className="text-xs text-white font-medium">Change photo</span>
              </div>
            )}
          </button>
        </div>

        {/* Avatar */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => fileRef.current?.click()}
            className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden hover:border-amber-500 transition"
          >
            {profile.avatar_url
              ? <img src={profile.avatar_url} className="w-full h-full object-cover" alt="" />
              : <span className="text-xl font-bold text-zinc-400">{profile.username[0]?.toUpperCase()}</span>}
          </button>
          <div>
            <p className="text-sm font-semibold text-white">@{profile.username}</p>
            <button
              onClick={() => fileRef.current?.click()}
              className="text-xs text-amber-500 hover:text-amber-400"
            >
              Cambiar foto
            </button>
          </div>
        </div>

        {/* Bio */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell us about yourself..."
            maxLength={160}
            rows={3}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-amber-500 resize-none"
          />
          <p className="text-right text-[10px] text-zinc-600">{bio.length}/160</p>
        </div>

        {/* Genres */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Genres</label>
          <div className="flex flex-wrap gap-1.5">
            {genres.map((tag) => (
              <button
                key={tag}
                onClick={() => removeGenre(tag)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium"
              >
                {tag} <X className="h-2.5 w-2.5" />
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={genreInput}
              onChange={(e) => setGenreInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addGenre(); } }}
              placeholder="e.g. Dark Trap, Neoclassical..."
              className="flex-1 h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-amber-500"
            />
            <button
              onClick={addGenre}
              className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition"
            >
              <Plus className="h-4 w-4 text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Worked with */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Worked with</label>
          <input
            value={workedWith}
            onChange={(e) => setWorkedWith(e.target.value)}
            placeholder="e.g. Bad Bunny, Hans Zimmer, Sony Music"
            className="w-full h-11 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-amber-500"
          />
        </div>

        {/* Worked in */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Worked in</label>
          <input
            value={workedIn}
            onChange={(e) => setWorkedIn(e.target.value)}
            placeholder="e.g. Succession, FIFA 25, Coca-Cola ad"
            className="w-full h-11 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-amber-500"
          />
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-11 rounded-xl bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 transition disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>

        <input ref={fileRef}   type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
        <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={handleBannerSelect} />
      </div>
    </>
  );
}
