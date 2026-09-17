export type WrapperKind = "xstock" | "ondo";

export type SessionName =
  | "regular"
  | "pre-market"
  | "after-hours"
  | "overnight"
  | "weekend";

export type PriceSource = "hermes" | "pyth-terminal" | "unavailable";

export type DemoEnv = "local" | "preview" | "production";

export type DemoHostInfo = {
  env: DemoEnv;
  label: string;
};

export type RouteVenue = "raydium" | "jupiter" | "dflow";

export type PegSign = "premium" | "discount" | "flat" | "unavailable";

export type BoardMark = {
  kind: "equity" | WrapperKind;
  label: string;
  issuer: string;
  symbol: string;
  feedId: string | null;
  priceUsd: number | null;
  confidenceUsd: number | null;
  publishTime: number | null;
  source: PriceSource;
  live: boolean;
  note: string | null;
};

export type PegVsEquity = {
  bps: number | null;
  pct: number | null;
  dollars: number | null;
  sign: PegSign;
};

export type SwapQuote = {
  venue: RouteVenue;
  available: boolean;
  reason: string | null;
  inMint: string;
  outMint: string;
  inAmountAtomic: string;
  outAmountAtomic: string | null;
  inDecimals: number;
  outDecimals: number;
  inUsd: number;
  outShares: number | null;
  effectiveUsdPerShare: number | null;
  priceImpactPct: number | null;
  hopLabels: string[];
  poolId: string | null;
  url: string | null;
};

export type WrapperRouteCard = {
  kind: WrapperKind;
  label: string;
  mint: string | null;
  decimals: number | null;
  quotes: SwapQuote[];
  featured: SwapQuote | null;
  cheapest: SwapQuote | null;
  raydiumIsCheapest: boolean | null;
  honesty: string;
};

export type SessionSnapshot = {
  name: SessionName;
  cashOpen: boolean;
  pythEquityOpen: boolean | null;
  nextOpen: number | null;
  nextClose: number | null;
  label: string;
  detail: string;
  afterHoursNarrative: boolean;
};

export type BoardPayload = {
  ticker: string;
  name: string;
  fetchedAt: number;
  demo: boolean;
  pythKeyConfigured: boolean;
  host: DemoHostInfo;
  session: SessionSnapshot;
  equity: BoardMark;
  wrappers: Array<BoardMark & { peg: PegVsEquity }>;
  redemptionRate: {
    symbol: string;
    value: number | null;
    source: PriceSource;
    note: string | null;
  } | null;
  quoteSizeUsd: number;
  routes: WrapperRouteCard[];
  cheapestHonest: {
    wrapper: WrapperKind;
    venue: RouteVenue;
    effectiveUsdPerShare: number;
    vsEquityBps: number | null;
    headline: string;
    ctaLabel: string;
    ctaUrl: string | null;
    caveat: string;
  } | null;
  warnings: string[];
};
