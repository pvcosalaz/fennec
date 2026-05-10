"use client";

import { useState } from "react";
import { Calendar, Check } from "lucide-react";

type Props = {
  taskTitle: string;
  onConfirm: (date: string) => void;
  onSkip: () => void;
};

function toYMD(d: Date): string {
  return d.toISOString().split("T")[0];
}

export default function SchedulePrompt({
  taskTitle,
  onConfirm,
  onSkip,
}: Props) {
  const [date, setDate] = useState<string>(toYMD(new Date()));
  const [done, setDone] = useState(false);

  const handleConfirm = () => {
    setDone(true);
    setTimeout(() => {
      onConfirm(date);
    }, 800);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onSkip}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto rounded-t-3xl border-t border-white/10 bg-zinc-950 p-6 space-y-5">
        {done ? (
          // Success state
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="h-12 w-12 rounded-full bg-accent/20 flex items-center justify-center">
              <Check className="h-6 w-6 text-accent" />
            </div>
            <p className="text-sm font-semibold text-white">¡Agendado! 🎬</p>
            <p className="text-xs text-zinc-500 text-center">
              Aparecerá en tu calendario de contenido.
            </p>
          </div>
        ) : (
          // Normal state
          <>
            {/* Header */}
            <div className="flex gap-4">
              <div className="h-10 w-10 rounded-2xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                <Calendar className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  ¿Cuándo lo agendamos?
                </p>
                <p className="text-xs text-zinc-500 line-clamp-2">
                  {taskTitle}
                </p>
              </div>
            </div>

            {/* Date input */}
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-12 rounded-2xl border border-white/15 bg-black/40 px-4 text-sm text-white"
              style={{ colorScheme: "dark" }}
            />

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onSkip}
                className="flex-1 py-3 rounded-2xl border border-white/10 text-sm text-zinc-400 hover:bg-white/5 transition-colors"
              >
                Ahora no
              </button>
              <button
                onClick={handleConfirm}
                disabled={!date}
                className="flex-1 py-3 rounded-2xl bg-accent text-sm font-bold text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent/90 transition-colors"
              >
                Agendar
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
