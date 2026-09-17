import { Skeleton } from "@/components/ui/skeleton";

export function BoardSkeleton() {
  return (
    <div className="min-h-screen" aria-busy="true" aria-live="polite">
      <header className="desk-header sticky top-0 z-40">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Tokenized equity desk
            </p>
            <h1 className="font-display text-3xl leading-none tracking-tight sm:text-4xl">PegLens</h1>
          </div>
          <Skeleton className="h-9 w-64" />
        </div>
      </header>
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <Skeleton className="h-36 w-full rounded-xl" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,20.5rem)]">
          <div className="space-y-5">
            <Skeleton className="h-24 w-72" />
            <Skeleton className="h-44 w-full" />
          </div>
          <Skeleton className="h-80" />
        </div>
      </div>
      <p className="sr-only">Loading live Pyth marks and DEX quotes. Empty cells stay empty.</p>
    </div>
  );
}
