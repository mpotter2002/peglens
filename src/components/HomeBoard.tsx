import Link from "next/link";
import { Suspense } from "react";
import { Search } from "lucide-react";
import { AppChrome } from "@/components/AppChrome";
import { MarketStripSection, MarketStripSkeleton } from "@/components/MarketStrip";
import { Input } from "@/components/ui/input";
import { TickerUniverse } from "@/lib/catalog/TickerUniverse";
import { DemoScript } from "@/lib/demo/DemoScript";
import { BoardView } from "@/lib/ui/BoardView";
import { Format } from "@/lib/ui/Format";
import type { DemoHostInfo, SessionSnapshot } from "@/lib/types";

export function HomeBoard({ host, session }: { host: DemoHostInfo; session: SessionSnapshot }) {
  const tickers = TickerUniverse.list();
  return (
    <div className="min-h-screen">
      <AppChrome host={host} sessionLabel={session.label} sessionClosed={session.afterHoursNarrative} />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Suspense fallback={<MarketStripSkeleton />}>
          <MarketStripSection session={session} />
        </Suspense>

        <div className="mt-8 max-w-3xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Home</p>
          <h2 className="font-display mt-1 text-3xl leading-none tracking-tight sm:text-4xl">Most popular</h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">{BoardView.homeIntro()}</p>
        </div>

        <form action="/" method="get" className="mt-5 max-w-xl rounded-lg bg-card px-2.5 py-2 ring-1 ring-foreground/10">
          <label
            className="px-0.5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground"
            htmlFor="home-ticker-input"
          >
            Search any US ticker
          </label>
          <div className="relative mt-1">
            <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="home-ticker-input"
              name="t"
              maxLength={6}
              placeholder="AAPL"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              className="h-8 pl-7 font-mono"
            />
          </div>
        </form>

        <ol className="mt-5 divide-y divide-border overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          {tickers.map((ticker) => {
            const name = TickerUniverse.catalogName(ticker);
            return (
              <li key={ticker}>
                <Link
                  href={`/?t=${ticker}`}
                  className="flex items-baseline justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-muted/60"
                >
                  <span className="flex min-w-0 items-baseline gap-3">
                    <span className="font-mono text-lg tracking-tight">{ticker}</span>
                    {name ? <span className="truncate text-sm text-muted-foreground">{name}</span> : null}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    Open desk
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>

        <ol className="mt-5 flex gap-2 overflow-x-auto text-[11px] text-muted-foreground">
          {DemoScript.steps().map((step) => (
            <li key={step.n} className="flex shrink-0 items-baseline gap-1.5 rounded-md bg-muted/60 px-2 py-1">
              <span className="font-mono text-[10px] text-session">{step.n}</span>
              <span className="text-foreground">{step.title}</span>
            </li>
          ))}
        </ol>
        <p className="mt-2 hidden text-[11px] text-muted-foreground lg:block">{session.detail}</p>
      </main>
      <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-4 text-xs text-muted-foreground sm:px-6">
        <p>PegLens · Stocklana · Pyth marks · honest DEX quotes · no custody, no fills.</p>
        <p className="font-mono">{Format.clock(Date.now())}</p>
      </footer>
    </div>
  );
}
