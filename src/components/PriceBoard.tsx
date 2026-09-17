"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import { AppChrome } from "@/components/AppChrome";
import { BoardSkeleton } from "@/components/BoardSkeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { TickerUniverse } from "@/lib/catalog/TickerUniverse";
import { BoardView } from "@/lib/ui/BoardView";
import { Format } from "@/lib/ui/Format";
import { cn } from "@/lib/utils";
import type { BoardPayload, WrapperRouteCard } from "@/lib/types";
import type { PegTone } from "@/lib/ui/BoardView";

export function PriceBoard({ ticker }: { ticker: string }) {
  const [active, setActive] = useState(ticker);
  const [board, setBoard] = useState<BoardPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [retry, setRetry] = useState(0);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setActive(TickerUniverse.normalize(ticker));
  }, [ticker]);

  useEffect(() => {
    let cancelled = false;
    const load = async (silent: boolean) => {
      if (!silent) {
        setPending(true);
      }
      try {
        const response = await fetch(`/api/board/${active}`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Board ${response.status}`);
        }
        const next = (await response.json()) as BoardPayload;
        if (cancelled) {
          return;
        }
        startTransition(() => {
          setBoard(next);
          setError(null);
        });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Refresh failed");
        }
      } finally {
        if (!cancelled) {
          setPending(false);
        }
      }
    };
    void load(false);
    const id = window.setInterval(() => void load(true), 8_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [active, retry]);

  function selectTicker(nextTicker: string) {
    const next = TickerUniverse.normalize(nextTicker);
    window.history.replaceState(null, "", `/?t=${next}`);
    setActive(next);
  }

  if (!board || board.ticker !== active) {
    return (
      <div>
        <BoardSkeleton />
        {error ? (
          <Alert className="fixed bottom-6 left-1/2 z-10 w-[min(32rem,calc(100%-2rem))] -translate-x-1/2 bg-card shadow-lg">
            <AlertTitle className="font-mono text-[10px] uppercase tracking-[0.22em]">Board unreachable</AlertTitle>
            <AlertDescription>
              {error}. PegLens will not invent marks while the API is down.
            </AlertDescription>
            <div className="mt-3">
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setError(null);
                  setRetry((value) => value + 1);
                }}
              >
                Retry
              </Button>
            </div>
          </Alert>
        ) : null}
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AppChrome host={board.host} sessionLabel={board.session.label} sessionClosed={board.session.afterHoursNarrative} />
      <div className="mx-auto max-w-7xl space-y-5 overflow-x-hidden px-4 py-5 sm:px-6">
        <TickerDesk active={active} onSelect={selectTicker} />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,21rem)]">
          <main className={cn("min-w-0 space-y-5", pending && "opacity-60 transition-opacity")}>
            <QuoteHero board={board} />
            <SessionStrip board={board} />
            {BoardView.noLivePrints(board) ? (
              <Alert>
                <AlertTitle>{BoardView.emptyTitle()}</AlertTitle>
                <AlertDescription>{BoardView.emptyBody(board.ticker)}</AlertDescription>
              </Alert>
            ) : null}
            <MarkCards board={board} />
            <VenueStrip board={board} />
            <div className="grid gap-5 md:grid-cols-2">
              <WrapperIdentity board={board} />
              <PegGuide ticker={board.ticker} />
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">{BoardView.pageHonesty()}</p>
            {error ? <p className="font-mono text-xs text-premium">{error}</p> : null}
          </main>
          <RouteTicket board={board} />
        </div>
      </div>
      <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-4 text-xs text-muted-foreground sm:px-6">
        <p>PegLens · Stocklana · Pyth marks · honest DEX quotes · no custody, no fills.</p>
        <p className="flex gap-3">
          <a className="underline decoration-border underline-offset-4" href="https://prestocks.com/products" target="_blank" rel="noreferrer">
            PreStocks
          </a>
          <a className="underline decoration-border underline-offset-4" href="https://app.tessera.pe" target="_blank" rel="noreferrer">
            Tessera
          </a>
        </p>
        <p className="font-mono">{Format.clock(board.fetchedAt)}</p>
      </footer>
    </div>
  );
}

function TickerDesk({
  active,
  onSelect,
}: {
  active: string;
  onSelect: (ticker: string) => void;
}) {
  const [draft, setDraft] = useState(active);
  useEffect(() => setDraft(active), [active]);
  return (
    <section className="rounded-lg bg-card px-2.5 py-2 ring-1 ring-foreground/10">
      <form
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          onSelect(draft);
        }}
      >
        <div className="min-w-0 flex-1">
          <label
            className="px-0.5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground"
            htmlFor="ticker-input"
          >
            Search any US ticker
          </label>
          <div className="relative mt-1">
            <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="ticker-input"
              value={draft}
              onChange={(event) => setDraft(event.target.value.toUpperCase())}
              maxLength={6}
              placeholder="AAPL"
              className="h-8 pl-7 font-mono"
            />
          </div>
        </div>
        <nav className="flex min-w-0 flex-nowrap gap-1 overflow-x-auto pb-0.5 sm:max-w-[62%]" aria-label="Most popular tickers">
          {TickerUniverse.list().map((ticker) => {
            const selected = ticker === active;
            return (
              <button
                key={ticker}
                type="button"
                onClick={() => onSelect(ticker)}
                className={cn(
                  "shrink-0 rounded-md px-2 py-1 font-mono text-xs transition-colors",
                  selected
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                aria-current={selected ? "page" : undefined}
              >
                {ticker}
              </button>
            );
          })}
        </nav>
      </form>
    </section>
  );
}

function QuoteHero({ board }: { board: BoardPayload }) {
  const sessionClosed = !board.session.cashOpen;
  const lastPrint = BoardView.lastCashPrint(board.equity, sessionClosed);
  const name = BoardView.companyLabel(board);
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          <Link href="/" className="underline decoration-border underline-offset-4">
            All tickers
          </Link>
          <span className="text-border"> / </span>
          Desk
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h2 className="font-display text-4xl leading-none tracking-tight sm:text-5xl">{board.ticker}</h2>
          {lastPrint ? (
            <Badge className="bg-session/15 text-session hover:bg-session/15">Last cash print</Badge>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{name}</p>
        <p className="price-xl font-display mt-3 text-5xl leading-none sm:text-6xl">
          {Format.compactUsd(board.equity.priceUsd)}
        </p>
        <p className="mt-2 font-mono text-xs text-muted-foreground">{BoardView.heroCaption(board.equity)}</p>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">{BoardView.cashPrintContext(board)}</p>
      </div>
      <div className="text-right">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          {BoardView.sourceCaption(board)}
        </p>
        <p className="text-xs text-muted-foreground">{BoardView.quoteSizeCaption(board)}</p>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">{BoardView.markFeedLine(board.equity)}</p>
      </div>
    </div>
  );
}

function SessionStrip({ board }: { board: BoardPayload }) {
  const hint = BoardView.nextSessionHint(board);
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-session">{board.session.label}</p>
      <p className="min-w-0 flex-1 text-[12px] leading-snug text-muted-foreground">
        {board.session.detail}
        {hint ? ` ${hint}` : ""}
      </p>
    </div>
  );
}

function MarkCards({ board }: { board: BoardPayload }) {
  const sessionClosed = !board.session.cashOpen;
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {BoardView.columns(board).map((column) => {
        const empty = column.mark.priceUsd === null;
        const lastPrint = BoardView.lastCashPrint(column.mark, sessionClosed);
        const note = BoardView.rowNote(column.mark);
        const route = BoardView.wrapperCard(board, column.mark.kind);
        return (
          <div
            key={column.mark.kind}
            className={cn("rounded-xl bg-card p-3.5 ring-1 ring-foreground/10", column.reference && "bg-muted/40")}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-session">{column.mark.label}</p>
                <p className="text-xs text-muted-foreground">{column.mark.issuer}</p>
              </div>
              {lastPrint ? (
                <Badge className="bg-session/15 text-session hover:bg-session/15">Last cash print</Badge>
              ) : (
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {BoardView.sourceOrSession(column.mark, sessionClosed)}
                </span>
              )}
            </div>
            <p className="price-xl font-mono mt-3 text-2xl">{Format.compactUsd(column.mark.priceUsd)}</p>
            <p className={cn("font-mono text-[11px]", empty ? "uppercase tracking-widest text-premium" : "text-muted-foreground")}>
              {BoardView.printMeta(column.mark)}
            </p>
            <p className={cn("mt-2 font-mono text-sm", pegClass(BoardView.pegTone(column.peg)))}>
              {BoardView.pegCopy(column.peg, true)}
            </p>
            <p className="mt-3 font-mono text-[10px] leading-snug text-muted-foreground">{BoardView.markSymbolLine(column.mark)}</p>
            <p className="font-mono text-[10px] leading-snug text-muted-foreground">{BoardView.markFeedLine(column.mark)}</p>
            {route ? (
              <p className="mt-1 font-mono text-[10px] leading-snug text-muted-foreground">{BoardView.wrapperMintLine(route)}</p>
            ) : null}
            {note ? <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{note}</p> : null}
          </div>
        );
      })}
    </div>
  );
}

function VenueStrip({ board }: { board: BoardPayload }) {
  return (
    <Card size="sm">
      <CardHeader className="border-b">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-session">Venue comparison</p>
        <CardTitle className="font-display text-xl font-normal">{BoardView.routeHeadline(board)}</CardTitle>
        <CardDescription>{BoardView.routeStory(board)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {BoardView.routeCards(board).map((card) => (
          <RouteQuotes key={card.kind} card={card} />
        ))}
      </CardContent>
    </Card>
  );
}

function WrapperIdentity({ board }: { board: BoardPayload }) {
  return (
    <Card size="sm">
      <CardHeader>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Wrapper identity</p>
        <CardTitle className="font-display text-lg font-normal">xStock and Ondo inventory</CardTitle>
        <CardDescription>Names and mints from issuer/token inventory when PegLens can resolve them. Missing stays empty.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {BoardView.routeCards(board).map((card) => {
          const source = BoardView.inventorySourceLabel(card.nameSource);
          return (
            <div key={card.kind}>
              <p className="font-mono text-[11px] uppercase tracking-widest text-session">{card.label}</p>
              <p className="text-sm">{BoardView.wrapperIdentityTitle(card)}</p>
              <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{BoardView.wrapperMintLine(card)}</p>
              {source && card.name ? (
                <p className="text-[11px] text-muted-foreground">Name source: {source}</p>
              ) : null}
            </div>
          );
        })}
        {board.redemptionRate ? (
          <p className="font-mono text-xs text-muted-foreground">
            {board.redemptionRate.symbol}: {board.redemptionRate.value === null ? "—" : board.redemptionRate.value.toFixed(4)} ·{" "}
            {board.redemptionRate.note}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">No xStock redemption-rate feed for this ticker.</p>
        )}
      </CardContent>
    </Card>
  );
}

function PegGuide({ ticker }: { ticker: string }) {
  return (
    <Card size="sm">
      <CardHeader>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">How to read this peg</p>
        <CardTitle className="font-display text-lg font-normal">Cash vs wrappers vs venues</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          {BoardView.pegGuide(ticker).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function pegClass(tone: PegTone): string {
  if (tone === "premium") {
    return "text-premium";
  }
  if (tone === "discount") {
    return "text-discount";
  }
  return "text-muted-foreground";
}

function RouteTicket({ board }: { board: BoardPayload }) {
  const featured = board.cheapestHonest;
  const cta = BoardView.ctaLabel(board);
  const alternatives = BoardView.alternativeQuotes(board);
  return (
    <Card className="h-fit min-w-0 overflow-hidden lg:sticky lg:top-24">
      <CardHeader>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-session">{BoardView.routeKicker(board)}</p>
        <CardTitle className="font-display text-2xl font-normal leading-tight break-words">
          {BoardView.routeHeadline(board)}
        </CardTitle>
        <CardDescription className="break-words text-pretty hyphens-auto">{BoardView.routeStory(board)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {featured ? (
          <p className="font-mono text-sm text-session">{BoardView.featuredMetrics(board)}</p>
        ) : (
          <Empty className="border border-dashed py-5">
            <EmptyHeader>
              <EmptyTitle>No swap CTA</EmptyTitle>
              <EmptyDescription>PegLens will not invent a pool or a fill.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
        {cta && featured?.ctaUrl ? (
          <Button asChild size="lg" className="h-auto w-full min-w-0 whitespace-normal py-2">
            <a href={featured.ctaUrl} target="_blank" rel="noreferrer" className="whitespace-normal">
              {cta}
              <ArrowUpRight className="size-4 shrink-0" />
            </a>
          </Button>
        ) : null}
        {alternatives.length > 0 ? (
          <div className="space-y-1.5">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Other buy sources</p>
            {alternatives.map((quote) => (
              <Button key={quote.venue} asChild variant="outline" size="sm" className="h-auto w-full min-w-0 justify-between whitespace-normal py-2">
                <a href={quote.url ?? undefined} target="_blank" rel="noreferrer">
                  <span>Open {BoardView.venueLabel(quote.venue)}</span>
                  <span className="font-mono">{Format.usd(quote.effectiveUsdPerShare, 2)}</span>
                </a>
              </Button>
            ))}
          </div>
        ) : null}
        {board.warnings.length > 0 ? (
          <div className="space-y-1">
            {board.warnings.map((warning) => (
              <p key={warning} className="text-xs text-muted-foreground">
                · {warning}
              </p>
            ))}
          </div>
        ) : null}
      </CardContent>
      {featured?.caveat ? (
        <CardFooter className="flex-col items-start gap-1">
          <p className="text-xs text-muted-foreground">{featured.caveat}</p>
        </CardFooter>
      ) : null}
    </Card>
  );
}

function RouteQuotes({ card }: { card: WrapperRouteCard }) {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{card.label}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{card.honesty}</p>
      <p className="mt-1 font-mono text-[11px] text-muted-foreground">mint {Format.mint(card.mint)}</p>
      {card.quotes.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">{BoardView.emptyQuotes()}</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {BoardView.sortedQuotes(card).map((quote) => {
            const winning = BoardView.marksCheapest(card, quote);
            return (
              <li
                key={quote.venue}
                className={cn(
                  "flex items-start justify-between gap-3 rounded-md px-1.5 py-1 font-mono text-[11px]",
                  winning && "bg-session/10",
                )}
              >
                <span className="flex min-w-0 items-baseline gap-1.5 uppercase tracking-widest text-muted-foreground">
                  <span>{BoardView.venueLabel(quote.venue)}</span>
                  {winning ? <span className="normal-case tracking-normal text-session">Cheapest</span> : null}
                </span>
                <span className={cn("max-w-[70%] text-right break-words", quote.available ? "text-foreground" : "text-premium")}>
                  {BoardView.quoteLine(quote)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
