/* Shared shell for the legal pages (/terms, /privacy, /data-deletion).
 *
 * These render inside the PWA's global chrome, where html/body are
 * overflow:hidden and the background is near-black — so a plain <main>
 * can't scroll and dark text is invisible. This wrapper brings its own
 * fixed scroll container, the brand's dark theme, and the fox up top. */

const AMBER = "#f5a623";

export default function LegalPage({ title, updated, children }: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 overflow-y-auto" style={{ background: "#0b0a08", WebkitOverflowScrolling: "touch" }}>
      <main className="mx-auto max-w-2xl px-6 pb-24 pt-14">
        {/* brand */}
        <a href="/" className="flex flex-col items-center gap-2 no-underline">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/fennec-logo.png"
            alt="Fennec"
            style={{ width: 64, height: "auto", filter: "brightness(0) invert(1)", opacity: 0.9 }}
          />
          <span className="text-[11px] font-semibold uppercase tracking-[0.35em]" style={{ color: AMBER }}>
            Fennec
          </span>
        </a>

        <h1 className="mt-8 text-center text-[26px] font-bold tracking-tight text-white">{title}</h1>
        <p className="mt-1 text-center text-[12px] text-zinc-500">Last updated: {updated}</p>

        <div className="legal-body mt-10">{children}</div>

        <style>{`
          .legal-body { color: #b8b8bf; font-size: 14.5px; line-height: 1.75; }
          .legal-body h2 { color: #fff; font-size: 15.5px; font-weight: 700; margin: 28px 0 8px; }
          .legal-body p, .legal-body li { margin: 0 0 12px; }
          .legal-body ul, .legal-body ol { padding-left: 22px; margin: 0 0 12px; }
          .legal-body li { margin-bottom: 6px; }
          .legal-body a { color: ${AMBER}; text-decoration: underline; text-underline-offset: 3px; }
          .legal-body strong { color: #e4e4e7; }
          .legal-footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,.08); text-align: center; }
        `}</style>
      </main>
    </div>
  );
}
