import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { TtlCache } from "@/lib/cache/TtlCache";
import { TickerUniverse } from "@/lib/catalog/TickerUniverse";
import { IntradayChart, type IntradaySeries } from "@/lib/market/IntradayChart";
import { INDEX_TICKERS, MarketPulse, type PulseRow } from "@/lib/market/MarketPulse";
import { BoardView } from "@/lib/ui/BoardView";
import { Format } from "@/lib/ui/Format";
import { cn } from "@/lib/utils";

const PULSE_TTL_MS = 30_000;
const CHART_TTL_MS = 60_000;

const SPARK_W = 96;
const SPARK_H = 32;

/**
 * Server loader for the home ticker list. Reuses the exact cache keys the
 * market strip uses ("market-pulse:home", "intraday:<ticker>"), so rendering
 * both on one page costs one Pyth pass and one Yahoo pass, not two.
 */
export async function TickerListSection() {
  const tickers = TickerUniverse.list().map((ticker) => ({
    ticker,
    name: INDEX_TICKERS.find((index) => index.ticker === ticker)?.name ?? TickerUniverse.catalogName(ticker) ?? ticker,
  }));
  const pulse = await TtlCache.remember("market-pulse:home", PULSE_TTL_MS, () => MarketPulse.load({ tickers }), {
    skipCache: (snapshot) => MarketPulse.isEmpty(snapshot),
  });
  const charts = Object.fromEntries(
    await Promise.all(
      tickers.map(async ({ ticker }) => {
        const series = await TtlCache.remember(`intraday:${ticker}`, CHART_TTL_MS, () => IntradayChart.load(ticker), {
          skipCache: (value) => value === null,
        });
        return [ticker, series] as const;
      }),
    ),
  );
  const byTicker = new Map(pulse.rows.map((row) => [row.ticker, row]));
  return <TickerList rows={tickers.map(({ ticker }) => byTicker.get(ticker) ?? null)} charts={charts} />;
}

export function TickerListSkeleton() {
  return (
    <div
      className="mt-5 divide-y divide-border overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10"
      aria-hidden="true"
    >
      {Array.from({ length: 12 }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="ml-auto hidden h-8 w-24 sm:block" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

/** Robinhood-style rows: identity left, real intraday line in the middle, cash price on the right. */
export function TickerList({
  rows,
  charts,
}: {
  rows: Array<PulseRow | null>;
  charts: Record<string, IntradaySeries | null>;
}) {
  return (
    <>
      <ol className="mt-5 divide-y divide-border overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        {rows.map((row) => {
          if (!row) return null;
          const series = charts[row.ticker] ?? null;
          const change = series ? IntradayChart.changePct(series) : null;
          return (
            <li key={row.ticker}>
              <Link
                href={`/?t=${row.ticker}`}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto]"
              >
                <span className="min-w-0">
                  <span className="block font-mono text-base tracking-tight">{row.ticker}</span>
                  <span className="block truncate text-xs text-muted-foreground">{row.name}</span>
                </span>
                <MiniSparkline series={series} ticker={row.ticker} />
                <span className="text-right">
                  <span className="block font-mono text-sm tabular-nums">
                    {row.cash ? Format.usd(row.cash.priceUsd) : "—"}
                  </span>
                  <span className={cn("block font-mono text-[11px] tabular-nums", changeTone(change))}>
                    {change === null ? "—" : Format.pct(change)}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-[11px] text-muted-foreground">{BoardView.homeListSourceNote()}</p>
    </>
  );
}

/** Compact intraday line for a list row. Real 5-minute closes only — no data means no line. */
function MiniSparkline({ series, ticker }: { series: IntradaySeries | null; ticker: string }) {
  if (!series) {
    return <span className="hidden h-8 w-24 sm:block" aria-hidden="true" />;
  }
  const change = IntradayChart.changePct(series);
  const up = (change ?? series.last - series.points[0].priceUsd) >= 0;
  const geo = IntradayChart.geometry(series, SPARK_W, SPARK_H);
  return (
    <svg
      viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
      preserveAspectRatio="none"
      className={cn("hidden h-8 w-24 sm:block", up ? "text-discount" : "text-premium")}
      role="img"
      aria-label={`${ticker} today: ${series.points.length} five-minute closes, last ${Format.usd(series.last)}`}
    >
      {geo.baselineY !== null ? (
        <line
          x1="0"
          x2={SPARK_W}
          y1={geo.baselineY}
          y2={geo.baselineY}
          className="stroke-muted-foreground/40"
          strokeDasharray="3 3"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
      <path
        d={geo.line}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function changeTone(pct: number | null): string {
  if (pct === null || Math.abs(pct) < 0.005) return "text-muted-foreground";
  return pct > 0 ? "text-discount" : "text-premium";
}
