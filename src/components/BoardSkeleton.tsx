import { Skeleton } from "@/components/ui/skeleton";

export function BoardSkeleton() {
  return (
    <div className="min-h-screen" aria-busy="true" aria-live="polite">
      <header className="border-b border-border/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Tokenized equity desk
            </p>
            <h1 className="font-display text-2xl leading-none">PegLens</h1>
          </div>
          <Skeleton className="h-9 w-64" />
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[11.5rem_minmax(0,1fr)_minmax(18rem,20.5rem)]">
        <Skeleton className="h-80" />
        <div className="space-y-5">
          <Skeleton className="h-24 w-72" />
          <Skeleton className="h-44 w-full" />
        </div>
        <Skeleton className="h-80" />
      </div>
      <p className="sr-only">Loading live Pyth marks and DEX quotes. Empty cells stay empty.</p>
    </div>
  );
}
