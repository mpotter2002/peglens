import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { TtlCache } from "@/lib/cache/TtlCache";
import { TickerUniverse } from "@/lib/catalog/TickerUniverse";
import { cn } from "@/lib/utils";
import { Format } from "@/lib/ui/Format";
import { IntradayChart, type IntradaySeries } from "@/lib/market/IntradayChart";
import {
  INDEX_TICKERS,
  MarketPulse,
  type MarketPulseSnapshot,
  type PulseLeg,
  type PulseRow,
} from "@/lib/market/MarketPulse";
import type { PegSign, SessionSnapshot } from "@/lib/types";

const PULSE_TTL_MS = 30_000;
/** Yahoo bars are 5 minutes wide, so a 60s cache never hides a new bar for long. */
const CHART_TTL_MS = 60_000;
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
  const charts = Object.fromEntries(
    await Promise.all(
      INDEX_TICKERS.map(async ({ ticker }) => {
        const series = await TtlCache.remember(`intraday:${ticker}`, CHART_TTL_MS, () => IntradayChart.load(ticker), {
          skipCache: (value) => value === null,
        });
        return [ticker, series] as const;
      }),
    ),
  );
  return <MarketStrip session={session} pulse={{ ...all, rows: indexRows }} gaps={all} charts={charts} />;
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
  charts = {},
}: {
  session: SessionSnapshot;
  pulse: MarketPulseSnapshot;
  gaps: MarketPulseSnapshot;
  charts?: Record<string, IntradaySeries | null>;
}) {
  return (
    <section aria-label="Market pulse" className="space-y-3">
      <SessionBanner session={session} />
      <div className="grid gap-3 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="grid gap-3 sm:grid-cols-2">
          {pulse.rows.map((row) => (
            <IndexCard key={row.ticker} row={row} series={charts[row.ticker] ?? null} />
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

function IndexCard({ row, series }: { row: PulseRow; series: IntradaySeries | null }) {
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
      <Sparkline series={series} label={`${row.name} (${row.ticker}) today`} />
      <p className="mt-2 mb-3 flex items-baseline justify-between gap-2 font-mono text-xs tabular-nums text-muted-foreground">
        <span>
          {row.ticker} <span className="text-foreground">{legPrice(row.cash)}</span>
        </span>
        <span>
          {row.ticker}x <span className="text-foreground">{legPrice(row.xstock)}</span>
        </span>
      </p>
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

function legPrice(leg: PulseLeg | null): string {
  return leg ? Format.usd(leg.priceUsd) : "—";
}

const SPARK_W = 240;
const SPARK_H = 112;

/** Real 5-minute closes for today's cash session, drawn against the prior close. No data means no line. */
function Sparkline({ series, label }: { series: IntradaySeries | null; label: string }) {
  if (!series) {
    return (
      <div className="mt-3 flex min-h-28 flex-1 items-center justify-center rounded-md border border-dashed border-border font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        No intraday data
      </div>
    );
  }
  const change = IntradayChart.changePct(series);
  const up = (change ?? series.last - series.points[0].priceUsd) >= 0;
  const geo = IntradayChart.geometry(series, SPARK_W, SPARK_H);
  const gradient = `spark-${series.ticker}`;
  return (
    <figure className="mt-3 flex flex-1 flex-col">
      <figcaption className="mb-1 flex items-baseline justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Today · 5m</span>
        <span className={cn("font-mono text-xs tabular-nums", changeTone(change))}>
          {change === null ? "—" : `${Format.pct(change)}`}
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
        preserveAspectRatio="none"
        className={cn("min-h-28 w-full flex-1 overflow-visible", up ? "text-discount" : "text-premium")}
        role="img"
        aria-label={`${label}: ${series.points.length} five-minute closes, last ${Format.usd(series.last)}${change === null ? "" : `, ${Format.pct(change)} vs prior close`}`}
      >
        <defs>
          <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {geo.baselineY !== null ? (
          <line
            x1="0"
            x2={SPARK_W}
            y1={geo.baselineY}
            y2={geo.baselineY}
            className="stroke-muted-foreground/50"
            strokeDasharray="3 3"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
        <path d={geo.area} fill={`url(#${gradient})`} />
        <path
          d={geo.line}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </figure>
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
        <p className="font-mono text-[10px] text-muted-foreground">Bar scale ±{Format.gapPct(scaleBps).replace(/^[+−]/, "")}</p>
      </div>
      <ol className="mt-3 space-y-1.5">
        {bars.map((bar, i) => (
          <li key={bar.ticker} className={cn(i >= MOBILE_BARS && "hidden sm:block")}>
            <Link href={`/?t=${bar.ticker}`} className="grid grid-cols-[3.25rem_1fr_4.25rem_4rem] items-center gap-2 text-xs">
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
                {bar.offScale ? (
                  <span
                    className={cn(
                      "absolute -inset-y-0.5 w-0.5 rounded-full bg-foreground",
                      (bar.gapBps ?? 0) >= 0 ? "right-0" : "left-0",
                    )}
                    title="Gap is wider than the ±1% bar scale"
                  />
                ) : null}
              </span>
              {bar.gapBps === null ? (
                <span className="col-span-2 text-right font-mono text-muted-foreground">no print</span>
              ) : (
                <>
                  <span className={cn("text-right font-mono tabular-nums", textTone(bar.sign))}>
                    {Format.gapPct(bar.gapBps)}
                  </span>
                  <span className="text-right font-mono tabular-nums text-muted-foreground">
                    {Format.signedUsd(bar.gapUsd, { flat: bar.sign === "flat" })}
                  </span>
                </>
              )}
            </Link>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[11px] text-muted-foreground">
        {priced > 0
          ? "Right of center: xStock trades above the cash print. Left: below. % of the cash price, then $ per share. Pyth marks, not fills."
          : "No live Pyth prints right now. PegLens will not draw an estimate."}
      </p>
    </div>
  );
}

function PegChip({ bps, sign }: { bps: number | null; sign: PegSign }) {
  return (
    <span className={cn("shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[11px] tabular-nums", chipTone(sign))}>
      {bps === null ? "no peg" : Format.gapPct(bps)}
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
