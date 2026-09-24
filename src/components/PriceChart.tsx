"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartLabels } from "@/lib/market/ChartLabels";
import {
  CHART_RANGES,
  type ChartRange,
  type IntradaySeries,
} from "@/lib/market/IntradayChart";
import { Format } from "@/lib/ui/Format";
import { cn } from "@/lib/utils";

const W = 600;
const PRICE_H = 190;
const VOLUME_H = 40;
const H = PRICE_H + VOLUME_H + 8;
const PAD_X = 4;
const PAD_TOP = 10;

type ChartResponse = { ticker: string; range: ChartRange; series: IntradaySeries | null };

const xLabel = (time: number, range: ChartRange) => ChartLabels.time(time, range);

export function PriceChart({ ticker }: { ticker: string }) {
  const [range, setRange] = useState<ChartRange>("1D");
  const [series, setSeries] = useState<IntradaySeries | null>(null);
  const [loading, setLoading] = useState(true);
  const [hover, setHover] = useState<number | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setHover(null);
    fetch(`/api/chart/${ticker}?range=${range}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: ChartResponse | null) => {
        if (!cancelled) setSeries(body?.series ?? null);
      })
      .catch(() => {
        if (!cancelled) setSeries(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ticker, range]);

  const points = series?.points ?? [];
  const last = points.length - 1;
  const prices = points.map((p) => p.priceUsd);
  if (series?.previousClose && range === "1D") prices.push(series.previousClose);
  const min = prices.length ? Math.min(...prices) : 0;
  const max = prices.length ? Math.max(...prices) : 0;
  const span = max - min;
  const x = (i: number) => PAD_X + (last === 0 ? 0 : (i / last) * (W - PAD_X * 2));
  const y = (price: number) =>
    PAD_TOP + (span === 0 ? PRICE_H / 2 : ((max - price) / span) * (PRICE_H - PAD_TOP * 2));
  const maxVolume = Math.max(0, ...points.map((p) => p.volume ?? 0));

  const active = hover !== null && points[hover] ? points[hover] : null;
  const shownPrice = active ? active.priceUsd : series?.last ?? null;
  const reference =
    range === "1D" && series?.previousClose ? series.previousClose : (points[0]?.priceUsd ?? null);
  const delta = shownPrice !== null && reference ? shownPrice - reference : null;
  const deltaPct = delta !== null && reference ? (delta / reference) * 100 : null;
  const up = (delta ?? 0) >= 0;

  const onMove = useCallback(
    (event: React.PointerEvent) => {
      const frame = frameRef.current;
      if (!frame) return;
      const rect = frame.getBoundingClientRect();
      setHover(ChartLabels.indexAt(event.clientX - rect.left, rect.width, points.length));
    },
    [points.length],
  );

  return (
    <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10" aria-label={`${ticker} price chart`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Cash chart · Yahoo {ChartLabels.caption(range)}
          </p>
          <p className="price-xl font-mono mt-1 text-3xl leading-none tabular-nums">
            {shownPrice !== null ? Format.usd(shownPrice) : "—"}
          </p>
          <p className={cn("mt-1 font-mono text-xs tabular-nums", delta === null || Math.abs(deltaPct ?? 0) < 0.005 ? "text-muted-foreground" : up ? "text-discount" : "text-premium")}>
            {delta === null || deltaPct === null
              ? "No change to report"
              : `${Format.signedUsd(delta)} (${Format.pct(deltaPct)}) ${ChartLabels.window(range)}`}
            {active ? ` · ${xLabel(active.time, range)}` : ""}
          </p>
        </div>
        <div className="flex gap-1" role="group" aria-label="Chart range">
          {CHART_RANGES.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={option === range}
              onClick={() => setRange(option)}
              className={cn(
                "h-8 min-w-9 rounded-md px-2 font-mono text-xs transition-colors sm:h-7 sm:min-w-0",
                option === range
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Skeleton className="mt-3 h-56 w-full" />
      ) : !series ? (
        <div className="mt-3 flex h-56 items-center justify-center rounded-md border border-dashed border-border font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          No chart data for this range
        </div>
      ) : (
        <>
          <div
            ref={frameRef}
            className="relative mt-3 cursor-crosshair touch-pan-y select-none"
            onPointerDown={onMove}
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
            onPointerCancel={() => setHover(null)}
          >
            <svg
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="none"
              className={cn("h-56 w-full overflow-visible", up ? "text-discount" : "text-premium")}
              role="img"
              aria-label={`${ticker} ${range}: ${points.length} closes from ${xLabel(points[0].time, range)} to ${xLabel(points[last].time, range)}, last ${Format.usd(series.last)}`}
            >
              <defs>
                <linearGradient id={`chart-fill-${ticker}`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                </linearGradient>
              </defs>
              {maxVolume > 0
                ? points.map((p, i) => (
                    <rect
                      key={`v${p.time}`}
                      x={x(i) - Math.max((W - PAD_X * 2) / points.length / 2 - 0.5, 0.5)}
                      y={H - ((p.volume ?? 0) / maxVolume) * VOLUME_H}
                      width={Math.max((W - PAD_X * 2) / points.length - 1, 1)}
                      height={((p.volume ?? 0) / maxVolume) * VOLUME_H}
                      className="fill-muted-foreground/25"
                    />
                  ))
                : null}
              {range === "1D" && series.previousClose ? (
                <line
                  x1={PAD_X}
                  x2={W - PAD_X}
                  y1={y(series.previousClose)}
                  y2={y(series.previousClose)}
                  className="stroke-muted-foreground/50"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              ) : null}
              <path
                d={`${points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)} ${y(p.priceUsd)}`).join(" ")} L${x(last)} ${PRICE_H} L${x(0)} ${PRICE_H} Z`}
                fill={`url(#chart-fill-${ticker})`}
              />
              <path
                d={points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)} ${y(p.priceUsd)}`).join(" ")}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
              {active && hover !== null ? (
                <g>
                  <line
                    x1={x(hover)}
                    x2={x(hover)}
                    y1={PAD_TOP}
                    y2={H}
                    className="stroke-foreground/40"
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                  />
                  <circle cx={x(hover)} cy={y(active.priceUsd)} r="3.5" className="fill-background stroke-current" strokeWidth="2" />
                </g>
              ) : null}
            </svg>
            <span className="pointer-events-none absolute top-0 right-0 font-mono text-[10px] tabular-nums text-muted-foreground">
              {Format.usd(max)}
            </span>
            <span className="pointer-events-none absolute right-0 font-mono text-[10px] tabular-nums text-muted-foreground" style={{ top: PRICE_H - 16 }}>
              {Format.usd(min)}
            </span>
          </div>
          <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
            <span>{xLabel(points[0].time, range)}</span>
            <span>{xLabel(points[Math.floor(last / 2)].time, range)}</span>
            <span>{xLabel(points[last].time, range)}</span>
          </div>
        </>
      )}
    </section>
  );
}
