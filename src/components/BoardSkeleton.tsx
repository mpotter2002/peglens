export function BoardSkeleton() {
  return (
    <div className="min-h-screen px-4 py-5 sm:px-8 sm:py-8" aria-busy="true" aria-live="polite">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-gold">Tokenized equity desk</p>
            <h1 className="font-display mt-1 text-5xl italic leading-none text-paper sm:text-6xl">PegLens</h1>
            <p className="mt-2 max-w-xl text-sm text-paper-dim">Loading live Pyth marks and DEX quotes. Empty cells stay empty.</p>
          </div>
          <div className="hairline h-20 w-64 animate-pulse rounded-2xl bg-white/5" />
        </div>
        <ol className="mt-6 grid gap-2 sm:grid-cols-5">
          {["01", "02", "03", "04", "05"].map((step) => (
            <li key={step} className="hairline h-14 animate-pulse rounded-xl bg-white/5" />
          ))}
        </ol>
        <div className="mt-6 grid gap-6 lg:grid-cols-[11rem_minmax(0,1fr)]">
          <aside className="hairline h-72 animate-pulse rounded-2xl bg-white/5" />
          <div>
            <div className="h-10 w-40 animate-pulse rounded-lg bg-white/5" />
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="hairline h-44 animate-pulse rounded-2xl bg-white/5" />
              <div className="hairline h-44 animate-pulse rounded-2xl bg-white/5" />
              <div className="hairline h-44 animate-pulse rounded-2xl bg-white/5" />
            </div>
            <div className="hairline mt-5 h-56 animate-pulse rounded-2xl bg-white/5" />
          </div>
        </div>
      </div>
    </div>
  );
}
