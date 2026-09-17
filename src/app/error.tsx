"use client";

export default function ErrorView({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen px-4 py-16">
      <div className="mx-auto max-w-lg hairline rounded-2xl p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-gold">Desk error</p>
        <h1 className="font-display mt-2 text-4xl italic">PegLens could not render</h1>
        <p className="mt-3 text-sm text-paper-dim">
          The board failed before any marks were shown. Nothing on this page is a price, a fill, or an estimate.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 rounded-full bg-paper px-5 py-3 text-sm font-medium text-ink"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
