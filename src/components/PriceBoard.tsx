"use client";

import { useEffect, useState, useTransition } from "react";
import { ArrowUpRight } from "lucide-react";
import { BoardSkeleton } from "@/components/BoardSkeleton";
import { ThemeToggle } from "@/components/ThemeToggle";
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
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TickerUniverse } from "@/lib/catalog/TickerUniverse";
import { DemoScript } from "@/lib/demo/DemoScript";
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
      <DeskChrome board={board} />
      <div className="mx-auto grid max-w-7xl gap-6 overflow-x-hidden px-4 py-6 sm:px-6 lg:grid-cols-[11.5rem_minmax(0,1fr)_minmax(18rem,20.5rem)]">
        <TickerRail active={active} onSelect={selectTicker} />
        <main className={cn("min-w-0", pending && "opacity-60 transition-opacity")}>
          <QuoteHero board={board} />
          {BoardView.noLivePrints(board) ? (
            <Alert className="mt-5">
              <AlertTitle>{BoardView.emptyTitle()}</AlertTitle>
              <AlertDescription>{BoardView.emptyBody(board.ticker)}</AlertDescription>
            </Alert>
          ) : null}
          <MarkList board={board} className="mt-6 md:hidden" />
          <MarkTable board={board} className="mt-6 hidden md:block" />
          {error ? <p className="mt-3 font-mono text-xs text-premium">{error}</p> : null}
        </main>
        <RouteTicket board={board} />
      </div>
      <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-4 text-xs text-muted-foreground sm:px-6">
        <p>PegLens · Stocklana · Pyth marks · Raydium-first routes · no custody, no fills.</p>
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

function DeskChrome({ board }: { board: BoardPayload }) {
  const closed = board.session.afterHoursNarrative;
  return (
    <header className="border-b border-border/80">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-baseline gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Tokenized equity desk
            </p>
            <h1 className="font-display text-2xl leading-none tracking-tight">PegLens</h1>
          </div>
          <p className="hidden max-w-sm text-sm text-muted-foreground md:block">
            Broker mark vs chain wrappers. Premium, discount, cheapest honest route.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{board.host.label}</Badge>
          <Badge variant="secondary">Not a broker</Badge>
          <div
            className={cn(
              "flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5",
              closed ? "bg-session/10" : "bg-discount/10",
            )}
            aria-live="polite"
          >
            <span className={cn("live-dot size-1.5 rounded-full", closed ? "bg-session" : "bg-discount")} />
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {board.session.label}
            </span>
          </div>
          <ThemeToggle />
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 pb-3 sm:px-6">
        <ol className="flex gap-2 overflow-x-auto text-[11px] text-muted-foreground">
          {DemoScript.steps().map((step) => (
            <li key={step.n} className="flex shrink-0 items-baseline gap-1.5 rounded-md bg-muted/60 px-2 py-1">
              <span className="font-mono text-[10px] text-session">{step.n}</span>
              <span className="text-foreground">{step.title}</span>
            </li>
          ))}
        </ol>
        <p className="mt-1 hidden text-[11px] text-muted-foreground lg:block">{board.session.detail}</p>
      </div>
    </header>
  );
}

function TickerRail({ active, onSelect }: { active: string; onSelect: (ticker: string) => void }) {
  const [draft, setDraft] = useState(active);
  useEffect(() => setDraft(active), [active]);
  return (
    <aside className="h-fit rounded-xl bg-card p-3 ring-1 ring-foreground/10">
      <p className="px-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Ticker</p>
      <nav className="mt-2 flex gap-1 overflow-x-auto lg:flex-col">
        {TickerUniverse.list().map((ticker) => {
          const selected = ticker === active;
          return (
            <button
              key={ticker}
              type="button"
              onClick={() => onSelect(ticker)}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-left font-mono text-sm transition-colors",
                selected
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              aria-current={selected ? "page" : undefined}
            >
              {ticker}
            </button>
          );
        })}
      </nav>
      <Separator className="my-3" />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSelect(draft);
        }}
      >
        <label className="px-1 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground" htmlFor="ticker-input">
          Any US ticker
        </label>
        <Input
          id="ticker-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value.toUpperCase())}
          maxLength={6}
          className="mt-1 font-mono"
        />
      </form>
    </aside>
  );
}

function QuoteHero({ board }: { board: BoardPayload }) {
  const sessionClosed = !board.session.cashOpen;
  const lastPrint = BoardView.lastCashPrint(board.equity, sessionClosed);
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-4xl leading-none tracking-tight sm:text-5xl">{board.ticker}</h2>
          {lastPrint ? (
            <Badge className="bg-session/15 text-session hover:bg-session/15">Last cash print</Badge>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{board.name}</p>
        <p className="price-xl font-display mt-3 text-5xl leading-none sm:text-6xl">
          {Format.compactUsd(board.equity.priceUsd)}
        </p>
        <p className="mt-2 font-mono text-xs text-muted-foreground">{BoardView.heroCaption(board.equity)}</p>
      </div>
      <div className="text-right">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          {BoardView.sourceCaption(board)}
        </p>
        <p className="text-xs text-muted-foreground">{BoardView.quoteSizeCaption(board)}</p>
      </div>
    </div>
  );
}

function MarkList({ board, className }: { board: BoardPayload; className?: string }) {
  const sessionClosed = !board.session.cashOpen;
  return (
    <div className={cn("space-y-2", className)}>
      {BoardView.columns(board).map((column) => {
        const empty = column.mark.priceUsd === null;
        const lastPrint = BoardView.lastCashPrint(column.mark, sessionClosed);
        const note = BoardView.rowNote(column.mark);
        return (
          <div
            key={column.mark.kind}
            className={cn("rounded-xl bg-card p-3 ring-1 ring-foreground/10", column.reference && "bg-muted/40")}
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
            <div className="mt-2">
              <p className="price-xl font-mono text-2xl">{Format.compactUsd(column.mark.priceUsd)}</p>
              <p className={cn("font-mono text-[11px]", empty ? "uppercase tracking-widest text-premium" : "text-muted-foreground")}>
                {BoardView.printMeta(column.mark)}
              </p>
              <p className={cn("mt-2 font-mono text-sm", pegClass(BoardView.pegTone(column.peg)))}>
                {BoardView.pegCopy(column.peg, true)}
              </p>
            </div>
            {note ? <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{note}</p> : null}
          </div>
        );
      })}
    </div>
  );
}

function MarkTable({ board, className }: { board: BoardPayload; className?: string }) {
  const sessionClosed = !board.session.cashOpen;
  return (
    <Card className={cn("py-0", className)}>
      <Table className="table-fixed">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[28%] whitespace-normal text-[10px] uppercase tracking-widest">Venue</TableHead>
            <TableHead className="w-[22%] text-right text-[10px] uppercase tracking-widest">Print</TableHead>
            <TableHead className="w-[28%] text-right text-[10px] uppercase tracking-widest">Vs cash</TableHead>
            <TableHead className="w-[22%] text-right text-[10px] uppercase tracking-widest">Source</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {BoardView.columns(board).map((column) => {
            const empty = column.mark.priceUsd === null;
            const lastPrint = BoardView.lastCashPrint(column.mark, sessionClosed);
            const note = BoardView.rowNote(column.mark);
            return (
              <TableRow key={column.mark.kind} className={column.reference ? "bg-muted/40" : undefined}>
                <TableCell className="align-top whitespace-normal">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-session">{column.mark.label}</p>
                  <p className="text-xs text-muted-foreground">{column.mark.issuer}</p>
                  {note ? <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{note}</p> : null}
                </TableCell>
                <TableCell className="align-top text-right">
                  <p className="price-xl font-mono text-xl">{Format.compactUsd(column.mark.priceUsd)}</p>
                  <p className={cn("font-mono text-[11px]", empty ? "uppercase tracking-widest text-premium" : "text-muted-foreground")}>
                    {BoardView.printMeta(column.mark)}
                  </p>
                </TableCell>
                <TableCell className={cn("align-top whitespace-normal text-right font-mono text-sm", pegClass(BoardView.pegTone(column.peg)))}>
                  {BoardView.pegCopy(column.peg, true)}
                </TableCell>
                <TableCell className="align-top whitespace-normal text-right">
                  {lastPrint ? (
                    <Badge className="bg-session/15 text-session hover:bg-session/15">Last cash print</Badge>
                  ) : (
                    <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      {BoardView.sourceOrSession(column.mark, sessionClosed)}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
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
  return (
    <Card className="h-fit min-w-0 overflow-hidden lg:sticky lg:top-4">
      <CardHeader>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-session">Cheapest honest route</p>
        <CardTitle className="font-display text-2xl font-normal leading-tight break-words">
          {BoardView.routeHeadline(board)}
        </CardTitle>
        <CardDescription className="text-pretty">{BoardView.routeStory()}</CardDescription>
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
          <Button asChild size="lg" className="w-full min-w-0 whitespace-normal">
            <a href={featured.ctaUrl} target="_blank" rel="noreferrer">
              {cta}
              <ArrowUpRight />
            </a>
          </Button>
        ) : null}
        <div className="space-y-3">
          {BoardView.routeCards(board).map((card) => (
            <RouteQuotes key={card.kind} card={card} />
          ))}
        </div>
        {board.redemptionRate ? (
          <p className="font-mono text-xs text-muted-foreground">
            {board.redemptionRate.symbol}: {board.redemptionRate.value === null ? "—" : board.redemptionRate.value.toFixed(4)} ·{" "}
            {board.redemptionRate.note}
          </p>
        ) : null}
      </CardContent>
      {board.warnings.length > 0 ? (
        <CardFooter className="flex-col items-start gap-1">
          {board.warnings.map((warning) => (
            <p key={warning} className="text-xs text-muted-foreground">
              · {warning}
            </p>
          ))}
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
          {card.quotes.map((quote) => (
            <li key={quote.venue} className="flex items-start justify-between gap-3 font-mono text-[11px]">
              <span className="uppercase tracking-widest text-muted-foreground">{BoardView.venueLabel(quote.venue)}</span>
              <span className={cn("max-w-[70%] text-right break-words", quote.available ? "text-foreground" : "text-premium")}>
                {BoardView.quoteLine(quote)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
