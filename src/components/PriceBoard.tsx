"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { BoardSkeleton } from "@/components/BoardSkeleton";
import { TickerUniverse } from "@/lib/catalog/TickerUniverse";
import { DemoScript } from "@/lib/demo/DemoScript";
import { Format } from "@/lib/ui/Format";
import type { BoardPayload, PegVsEquity, BoardMark, WrapperRouteCard } from "@/lib/types";

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
          <div className="fixed bottom-6 left-1/2 z-10 w-[min(32rem,calc(100%-2rem))] -translate-x-1/2 hairline rounded-2xl bg-ink p-4 shadow-lg">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold">Board unreachable</p>
            <p className="mt-2 text-sm text-paper-dim">
              {error}. PegLens will not invent marks while the API is down.
            </p>
            <button
              type="button"
              className="mt-3 rounded-full bg-paper px-4 py-2 text-sm text-ink"
              onClick={() => {
                setError(null);
                setRetry((value) => value + 1);
              }}
            >
              Retry
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-5 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <Header board={board} />
        <DemoPath />
        <div className="mt-6 grid gap-6 lg:grid-cols-[11rem_minmax(0,1fr)]">
          <TickerRail active={active} onSelect={selectTicker} />
          <main className={pending ? "opacity-60 transition-opacity" : "transition-opacity"}>
            <Identity board={board} />
            <EmptyMarks board={board} />
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <MarkCard mark={board.equity} peg={null} sessionClosed={!board.session.cashOpen} />
              {board.wrappers.map((wrapper) => (
                <MarkCard
                  key={wrapper.kind}
                  mark={wrapper}
                  peg={wrapper.peg}
                  sessionClosed={!board.session.cashOpen}
                />
              ))}
            </div>
            <RouteStrip board={board} />
            {error ? <p className="mt-3 font-mono text-xs text-premium">{error}</p> : null}
          </main>
        </div>
        <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-rule)] pt-4 text-xs text-mute">
          <p>PegLens MVP · Stocklana · Pyth marks · Raydium-first routes · no custody, no fills.</p>
          <p className="flex gap-3">
            <a className="underline decoration-[var(--color-rule)]" href="https://prestocks.com/products" target="_blank" rel="noreferrer">
              PreStocks
            </a>
            <a className="underline decoration-[var(--color-rule)]" href="https://app.tessera.pe" target="_blank" rel="noreferrer">
              Tessera
            </a>
          </p>
          <p className="font-mono">{Format.clock(board.fetchedAt)}</p>
        </footer>
      </div>
    </div>
  );
}

function Header({ board }: { board: BoardPayload }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-gold">Tokenized equity desk</p>
        <h1 className="font-display mt-1 text-5xl italic leading-none text-paper sm:text-6xl">PegLens</h1>
        <p className="mt-2 max-w-xl text-sm text-paper-dim">
          Same ticker. Broker mark vs chain wrappers. Premium, discount, and the cheapest honest route.
        </p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <div className="flex flex-wrap justify-end gap-2">
          <span className="hairline rounded-full px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-gold-2">
            {board.host.label}
          </span>
          <span className="hairline rounded-full px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-mute">
            Not a broker
          </span>
        </div>
        <SessionBadge board={board} />
      </div>
    </header>
  );
}

function SessionBadge({ board }: { board: BoardPayload }) {
  const closed = board.session.afterHoursNarrative;
  return (
    <div
      className={`hairline min-w-[16rem] rounded-2xl px-4 py-3 ${closed ? "bg-gold/10" : "bg-discount/10"}`}
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <span className={`live-dot h-2 w-2 rounded-full ${closed ? "bg-gold" : "bg-discount"}`} />
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-gold-2">{board.session.label}</p>
      </div>
      <p className="mt-1 max-w-sm text-sm leading-snug text-paper-dim">{board.session.detail}</p>
    </div>
  );
}

function DemoPath() {
  return (
    <ol className="mt-6 grid gap-2 sm:grid-cols-5">
      {DemoScript.steps().map((step) => (
        <li key={step.n} className="hairline rounded-xl px-3 py-2">
          <span className="font-mono text-[10px] text-gold">{step.n}</span>
          <p className="text-xs text-paper">{step.title}</p>
          <p className="mt-1 text-[11px] leading-snug text-mute">{step.lookFor}</p>
        </li>
      ))}
    </ol>
  );
}

function TickerRail({ active, onSelect }: { active: string; onSelect: (ticker: string) => void }) {
  const [draft, setDraft] = useState(active);
  useEffect(() => setDraft(active), [active]);
  return (
    <aside className="hairline h-fit rounded-2xl p-3">
      <p className="px-2 font-mono text-[10px] uppercase tracking-[0.22em] text-mute">Ticker</p>
      <nav className="mt-2 flex gap-2 overflow-x-auto lg:flex-col">
        {TickerUniverse.list().map((ticker) => {
          const selected = ticker === active;
          return (
            <button
              key={ticker}
              type="button"
              onClick={() => onSelect(ticker)}
              className={`rounded-xl px-3 py-2 text-left font-mono text-sm ${
                selected ? "bg-paper text-ink" : "text-paper-dim hover:bg-white/5"
              }`}
              aria-current={selected ? "page" : undefined}
            >
              {ticker}
            </button>
          );
        })}
      </nav>
      <form
        className="mt-3 border-t border-[var(--color-rule)] pt-3"
        onSubmit={(event) => {
          event.preventDefault();
          onSelect(draft);
        }}
      >
        <label className="px-2 font-mono text-[10px] uppercase tracking-[0.22em] text-mute" htmlFor="ticker-input">
          Any US ticker
        </label>
        <input
          id="ticker-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value.toUpperCase())}
          maxLength={6}
          className="mt-1 w-full rounded-xl bg-transparent px-3 py-2 font-mono text-sm outline-none ring-1 ring-[var(--color-rule)] focus:ring-gold"
        />
      </form>
    </aside>
  );
}

function Identity({ board }: { board: BoardPayload }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="font-display text-4xl italic leading-none">{board.ticker}</p>
        <p className="mt-1 text-sm text-paper-dim">{board.name}</p>
      </div>
      <div className="text-right">
        <p className="font-mono text-[11px] uppercase tracking-widest text-mute">
          {board.pythKeyConfigured ? "Pyth Hermes" : "Pyth Terminal snapshot"}
        </p>
        <p className="text-xs text-mute">Quotes never execute · ${board.quoteSizeUsd} USDC sample size</p>
      </div>
    </div>
  );
}

function EmptyMarks({ board }: { board: BoardPayload }) {
  const noPrints =
    board.equity.priceUsd === null && board.wrappers.every((wrapper) => wrapper.priceUsd === null);
  if (!noPrints) {
    return null;
  }
  return (
    <div className="hairline mt-5 rounded-2xl p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold">No live prints</p>
      <p className="mt-2 text-sm text-paper-dim">
        Pyth did not return a cash, xStock, or Ondo mark for {board.ticker}. PegLens will not invent a
        price. Try AAPL, or set <span className="font-mono text-gold-2">PYTH_API_KEY</span> for signed
        Hermes ticks.
      </p>
    </div>
  );
}

function MarkCard({
  mark,
  peg,
  sessionClosed,
}: {
  mark: BoardMark;
  peg: PegVsEquity | null;
  sessionClosed: boolean;
}) {
  const pegClass =
    peg?.sign === "premium" ? "text-premium" : peg?.sign === "discount" ? "text-discount" : "text-mute";
  const empty = mark.priceUsd === null;
  return (
    <article className="hairline rounded-2xl p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">{mark.label}</p>
          <p className="text-xs text-mute">{mark.issuer}</p>
        </div>
        {mark.kind === "equity" && sessionClosed && mark.priceUsd !== null ? (
          <span className="rounded-full bg-gold/15 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-gold">
            Last cash print
          </span>
        ) : (
          <span className="font-mono text-[10px] uppercase tracking-widest text-mute">{mark.source}</span>
        )}
      </div>
      <p className="price-xl mt-4 font-mono text-4xl">{Format.compactUsd(mark.priceUsd)}</p>
      {empty ? (
        <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-premium">No print</p>
      ) : (
        <p className="mt-1 truncate font-mono text-[11px] text-mute">
          {mark.symbol}
          {mark.publishTime ? ` · ${Format.relative(mark.publishTime)}` : mark.source === "pyth-terminal" ? " · terminal snapshot" : ""}
        </p>
      )}
      {peg ? (
        <p className={`mt-3 font-mono text-sm ${pegClass}`}>
          {peg.sign === "unavailable"
            ? "No peg yet"
            : peg.sign === "flat"
              ? `In line · ${Format.bps(peg.bps)} vs cash`
              : `${Format.bps(peg.bps)} vs cash · ${Format.usd(peg.dollars, 2)}`}
        </p>
      ) : (
        <p className="mt-3 text-sm text-paper-dim">Reference mark for every wrapper on this board.</p>
      )}
      {mark.note ? <p className="mt-3 text-xs leading-snug text-mute">{mark.note}</p> : null}
    </article>
  );
}

function RouteStrip({ board }: { board: BoardPayload }) {
  const featured = board.cheapestHonest;
  return (
    <section className="hairline mt-5 rounded-2xl p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold">Cheapest honest route</p>
          <h2 className="font-display mt-1 text-3xl italic">
            {featured?.headline ?? "No executable route right now — PegLens will not invent a pool"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-paper-dim">
            Raydium is the default story because it still dominates Solana xStocks volume. If it has no pool, PegLens
            says so and shows the next real quote.
          </p>
        </div>
        {featured?.ctaUrl ? (
          <a
            href={featured.ctaUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-paper px-5 py-3 text-sm font-medium text-ink no-underline"
          >
            {featured.ctaLabel}
          </a>
        ) : (
          <span className="rounded-full bg-white/5 px-5 py-3 text-sm text-mute">No swap CTA</span>
        )}
      </div>
      {featured ? (
        <p className="mt-3 font-mono text-sm text-gold-2">
          {Format.usd(featured.effectiveUsdPerShare, 2)} / share
          {featured.vsEquityBps !== null ? ` · ${Format.bps(featured.vsEquityBps)} vs cash mark` : ""} · {featured.caveat}
        </p>
      ) : null}
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {board.routes.map((card) => (
          <RouteCard key={card.kind} card={card} />
        ))}
      </div>
      {board.redemptionRate ? (
        <p className="mt-4 font-mono text-xs text-mute">
          {board.redemptionRate.symbol}: {board.redemptionRate.value === null ? "—" : board.redemptionRate.value.toFixed(4)} ·{" "}
          {board.redemptionRate.note}
        </p>
      ) : null}
      {board.warnings.length > 0 ? (
        <ul className="mt-3 space-y-1 text-xs text-mute">
          {board.warnings.map((warning) => (
            <li key={warning}>· {warning}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function RouteCard({ card }: { card: WrapperRouteCard }) {
  const quotes = useMemo(() => card.quotes, [card.quotes]);
  return (
    <div className="rounded-xl bg-white/5 p-3">
      <p className="font-mono text-[11px] uppercase tracking-widest text-gold-2">{card.label}</p>
      <p className="mt-1 text-sm text-paper-dim">{card.honesty}</p>
      <p className="mt-2 font-mono text-[11px] text-mute">mint {Format.mint(card.mint)}</p>
      <ul className="mt-3 space-y-2">
        {quotes.length === 0 ? (
          <li className="text-xs text-mute">No venue quoted — not a simulated fill.</li>
        ) : (
          quotes.map((quote) => (
            <li key={quote.venue} className="flex items-baseline justify-between gap-3 font-mono text-xs">
              <span className="uppercase tracking-widest text-mute">{quote.venue}</span>
              <span className={quote.available ? "text-paper" : "text-premium"}>
                {quote.available
                  ? `${Format.usd(quote.effectiveUsdPerShare, 2)} · ${quote.hopLabels.join(" → ") || "direct"}`
                  : quote.reason}
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
