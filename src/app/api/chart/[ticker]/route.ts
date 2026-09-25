import { TtlCache } from "@/lib/cache/TtlCache";
import { TickerUniverse } from "@/lib/catalog/TickerUniverse";
import { IntradayChart, type ChartRange } from "@/lib/market/IntradayChart";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

/** Longer ranges change slowly, so they can sit in cache longer. */
const RANGE_TTL_MS: Record<ChartRange, number> = {
  "1D": 60_000,
  "1W": 300_000,
  "1M": 900_000,
  "3M": 900_000,
  "1Y": 3_600_000,
};

export async function GET(
  request: Request,
  context: { params: Promise<{ ticker: string }> },
) {
  const { ticker: raw } = await context.params;
  const ticker = TickerUniverse.normalize(raw);
  const range = IntradayChart.normalizeRange(new URL(request.url).searchParams.get("range"));
  const series = await TtlCache.remember(
    `chart:${ticker}:${range}`,
    RANGE_TTL_MS[range],
    () => IntradayChart.load(ticker, range),
    { skipCache: (value) => value === null },
  );
  return Response.json(
    { ticker, range, series },
    { headers: { "cache-control": "no-store" } },
  );
}
