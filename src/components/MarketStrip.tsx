import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { TtlCache } from "@/lib/cache/TtlCache";
import { TickerUniverse } from "@/lib/catalog/TickerUniverse";
import { cn } from "@/lib/utils";
import { Format } from "@/lib/ui/Format";
import {
  INDEX_TICKERS,
  MarketPulse,
  type MarketPulseSnapshot,
  type PulseLeg,
  type PulseRow,
} from "@/lib/market/MarketPulse";
import type { PegSign, SessionSnapshot } from "@/lib/types";

const PULSE_TTL_MS = 30_000;
/** Small screens show only the widest gaps so the ticker list stays near the fold. */
const MOBILE_BARS = 6;

/** Server loader: one Pyth pass for every desk ticker, shared by the index cards and the gap chart. */
export async function MarketStripSection({ session }: { session: SessionSnapshot }) {
  const tickers = TickerUniverse.list().map((ticker) => ({
    ticker,
    name: INDEX_TICKERS.find((index) => index.ticker === ticker)?.name ?? TickerUniverse.catalogName(ticker) ?? ticker,
  }));
  const all = await TtlCache.remember("market-pulse:home", PULSE_TTL_MS, () => MarketPulse.load({ tickers }), {
    skipCache: (snapshot) => MarketPulse.isEmpty(snapshot),
  });
  const indexRows = INDEX_TICKERS.map(({ ticker }) => all.rows.find((row) => row.ticker === ticker)).filter(
    (row): row is PulseRow => Boolean(row),
  );
  return <MarketStrip session={session} pulse={{ ...all, rows: indexRows }} gaps={all} />;
}

export function MarketStripSkeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      <Skeleton className="h-9 w-full rounded-lg" />
      <div className="grid gap-3 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-44 rounded-xl" />
        </div>
        <Skeleton className="h-44 rounded-xl" />
      </div>
    </div>
  );
}

export function MarketStrip({
  session,
  pulse,
  gaps,
}: {
  session: SessionSnapshot;
  pulse: MarketPulseSnapshot;
  gaps: MarketPulseSnapshot;
}) {
  return (
    <section aria-label="Market pulse" className="space-y-3">
      <SessionBanner session={session} />
      <div className="grid gap-3 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="grid gap-3 sm:grid-cols-2">
          {pulse.rows.map((row) => (
            <IndexCard key={row.ticker} row={row} />
          ))}
        </div>
        <GapChart snapshot={gaps} />
      </div>
    </section>
  );
}

function SessionBanner({ session }: { session: SessionSnapshot }) {
  const open = session.cashOpen;
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg px-3 py-2 ring-1 ring-foreground/10",
        open ? "bg-discount/10" : "bg-session/10",
      )}
    >
      <p className="flex items-center gap-2 text-sm">
        <span className={cn("live-dot size-1.5 rounded-full", open ? "bg-discount" : "bg-session")} />
        <span className="font-medium">{open ? "US market open" : `US market closed · ${session.label}`}</span>
        <span className="text-muted-foreground">
          {open ? "Cash and xStocks both trading." : "xStocks keep trading 24/7 on Solana."}
        </span>
      </p>
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        NYSE 09:30–16:00 ET
      </p>
    </div>
  );
}

function IndexCard({ row }: { row: PulseRow }) {
  return (
    <Link
      href={`/?t=${row.ticker}`}
      className="group flex flex-col rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-colors hover:bg-muted/60"
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{row.ticker}</p>
          <h3 className="font-display text-xl leading-tight tracking-tight">{row.name}</h3>
        </div>
        <PegChip bps={row.gapBps} sign={row.sign} />
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-3">
        <LegCell label="Cash" leg={row.cash} />
        <LegCell label={`${row.ticker}x`} leg={row.xstock} />
      </dl>
      <p className="mt-auto flex items-center justify-between border-t border-border pt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground group-hover:text-foreground">
        <span>{gapLine(row)}</span>
        <span>Open desk →</span>
      </p>
    </Link>
  );
}

function gapLine(row: PulseRow): string {
  if (row.gapBps === null) return "No peg yet";
  if (row.sign === "flat") return "xStock in line with cash";
  return row.sign === "premium" ? "xStock above cash" : "xStock below cash";
}

function LegCell({ label, leg }: { label: string; leg: PulseLeg | null }) {
  return (
    <div className="min-w-0">
      <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-mono text-2xl tracking-tight tabular-nums">{leg ? Format.usd(leg.priceUsd) : "—"}</dd>
      <dd className={cn("mt-0.5 mb-4 font-mono text-xs tabular-nums", changeTone(leg?.changePct24h ?? null))}>
        {leg ? `${Format.pct(leg.changePct24h)} 24h` : "No print"}
      </dd>
    </div>
  );
}

function GapChart({ snapshot }: { snapshot: MarketPulseSnapshot }) {
  const { bars, scaleBps } = MarketPulse.gapChart(snapshot.rows);
  const priced = bars.filter((bar) => bar.gapBps !== null).length;
  return (
    <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Chain vs cash</p>
          <h3 className="font-display text-xl leading-tight tracking-tight">xStock gap right now</h3>
        </div>
        <p className="font-mono text-[10px] text-muted-foreground">±{Math.round(scaleBps)} bps</p>
      </div>
      <ol className="mt-3 space-y-1.5">
        {bars.map((bar, i) => (
          <li key={bar.ticker} className={cn(i >= MOBILE_BARS && "hidden sm:block")}>
            <Link href={`/?t=${bar.ticker}`} className="grid grid-cols-[3.25rem_1fr_4.5rem] items-center gap-2 text-xs">
              <span className="font-mono">{bar.ticker}</span>
              <span className="relative h-2 rounded-full bg-muted" aria-hidden="true">
                <span className="absolute inset-y-0 left-1/2 w-px bg-foreground/20" />
                {bar.gapBps !== null ? (
                  <span
                    className={cn(
                      "absolute inset-y-0 rounded-full",
                      bar.gapBps >= 0 ? "left-1/2" : "right-1/2",
                      barTone(bar.sign),
                    )}
                    style={{ width: `${Math.max(bar.widthPct / 2, 0.75)}%` }}
                  />
                ) : null}
              </span>
              <span className={cn("text-right font-mono tabular-nums", bar.gapBps === null ? "text-muted-foreground" : textTone(bar.sign))}>
                {bar.gapBps === null ? "no print" : Format.bps(bar.gapBps)}
              </span>
            </Link>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[11px] text-muted-foreground">
        {priced > 0
          ? "Right of center: xStock trades above the cash print. Left: below. Pyth marks, not fills."
          : "No live Pyth prints right now. PegLens will not draw an estimate."}
      </p>
    </div>
  );
}

function PegChip({ bps, sign }: { bps: number | null; sign: PegSign }) {
  return (
    <span className={cn("shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[11px] tabular-nums", chipTone(sign))}>
      {bps === null ? "no peg" : Format.bps(bps)}
    </span>
  );
}

function changeTone(pct: number | null): string {
  if (pct === null || Math.abs(pct) < 0.005) return "text-muted-foreground";
  return pct > 0 ? "text-discount" : "text-premium";
}

function textTone(sign: PegSign): string {
  if (sign === "premium") return "text-premium";
  if (sign === "discount") return "text-discount";
  return "text-muted-foreground";
}

function barTone(sign: PegSign): string {
  if (sign === "premium") return "bg-premium";
  if (sign === "discount") return "bg-discount";
  return "bg-foreground/40";
}

function chipTone(sign: PegSign): string {
  if (sign === "premium") return "bg-premium/10 text-premium";
  if (sign === "discount") return "bg-discount/10 text-discount";
  return "bg-muted text-muted-foreground";
}
