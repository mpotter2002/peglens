import { BoardComposer } from "@/lib/board/BoardComposer";
import { PegMath } from "@/lib/board/PegMath";
import { TickerUniverse } from "@/lib/catalog/TickerUniverse";
import type {
  BoardMark,
  BoardPayload,
  PegVsEquity,
  RouteVenue,
  SessionName,
  WrapperKind,
} from "@/lib/types";

/**
 * Read-only agent view of one board. Every number comes from BoardComposer (the same
 * payload the desk renders); this class only reshapes it and labels source and freshness.
 * It never computes its own prices, and it carries no day-change or rolling 24h figure.
 */

/** A timestamped Pyth tick older than this is flagged stale. */
const STALE_AFTER_SECONDS = 120;

export type Freshness =
  | { kind: "timestamped"; publishedAt: string; ageSeconds: number; stale: boolean }
  | { kind: "untimed_snapshot"; publishedAt: null; ageSeconds: null; stale: null }
  | { kind: "none"; publishedAt: null; ageSeconds: null; stale: null };

export type AgentSource = "pyth-hermes" | "pyth-terminal-snapshot" | "unavailable";

export type CashLeg = {
  label: string;
  feedSymbol: string | null;
  feedId: string | null;
  priceUsd: number | null;
  confidenceUsd: number | null;
  /** regular_session: US cash is open. last_cash_print: closed, so this is the last print, not a quote. */
  status: "regular_session" | "last_cash_print" | "unavailable";
  source: AgentSource;
  freshness: Freshness;
  missing: string | null;
};

export type WrapperLeg = {
  kind: WrapperKind;
  symbol: string;
  issuer: string;
  feedSymbol: string | null;
  feedId: string | null;
  priceUsd: number | null;
  confidenceUsd: number | null;
  source: AgentSource;
  freshness: Freshness;
  /** Wrapper mark vs the cash mark. null when either side has no price. */
  vsCash: { pct: number; dollars: number; direction: "premium" | "discount" | "flat" } | null;
  identity: {
    mint: string | null;
    decimals: number | null;
    name: string | null;
    nameSource: "xstocks-public-inventory" | "jupiter-token-search" | null;
  };
  missing: string | null;
};

export type VenueQuote = {
  wrapper: WrapperKind;
  symbol: string;
  venue: RouteVenue;
  available: boolean;
  effectiveUsdPerShare: number | null;
  /** Quote price vs the cash mark, in percent. null when either is missing. */
  vsCashPct: number | null;
  priceImpactPct: number | null;
  reason: string | null;
  url: string | null;
};

export type TickerComparison = {
  ticker: string;
  name: string;
  curated: boolean;
  /** ok: cash and at least one wrapper priced, so a premium/discount exists. partial: some data, no comparison. */
  status: "ok" | "partial" | "no_data";
  observedAt: string;
  session: { name: SessionName; cashOpen: boolean; label: string; detail: string };
  cash: CashLeg;
  wrappers: WrapperLeg[];
  redemptionRate: { symbol: string; value: number | null; note: string | null } | null;
  venues: {
    quoteSizeUsd: number;
    /** true only when two or more venue quotes priced, so "cheapest" means something. */
    comparable: boolean;
    cheapest: {
      wrapper: WrapperKind;
      venue: RouteVenue;
      effectiveUsdPerShare: number;
      vsCashPct: number | null;
      claimCheapest: boolean;
      caveat: string;
    } | null;
    quotes: VenueQuote[];
  };
  warnings: string[];
  notes: string[];
  links: { desk: string; json: string };
};

export type TickerList = {
  tickers: Array<{ ticker: string; name: string; cashFeed: string; xstock: string; ondo: string }>;
  note: string;
};

const BASE_NOTES = [
  "Read-only. xStockLens never signs, trades, custodies, or holds a wallet.",
  "Prices are Pyth marks and indicative DEX quotes, not fills. Not investment advice.",
  "Null means no data. It is never an estimate or a zero.",
];

export class AgentCompare {
  static readonly STALE_AFTER_SECONDS = STALE_AFTER_SECONDS;

  static parseTicker(raw: unknown): { ok: true; ticker: string } | { ok: false; error: string } {
    if (typeof raw !== "string") {
      return { ok: false, error: "ticker must be a string of 1-6 letters, e.g. \"AAPL\"." };
    }
    const ticker = raw.trim().toUpperCase();
    if (!/^[A-Z]{1,6}$/.test(ticker)) {
      return { ok: false, error: `"${raw}" is not a US ticker. Use 1-6 letters, e.g. "AAPL".` };
    }
    return { ok: true, ticker };
  }

  static tickers(): TickerList {
    return {
      tickers: TickerUniverse.list().map((ticker) => ({
        ticker,
        name: TickerUniverse.catalogName(ticker) ?? ticker,
        cashFeed: `Equity.US.${ticker}/USD`,
        xstock: `${ticker}x`,
        ondo: `${ticker}on`,
      })),
      note: "Curated desk list. compare_ticker also accepts any 1-6 letter US ticker; tickers without Pyth feeds or wrapper mints come back with null prices and a reason.",
    };
  }

  static async compare(ticker: string, now: () => number = Date.now): Promise<TickerComparison> {
    const board = await BoardComposer.compose(ticker);
    return this.fromBoard(board, now());
  }

  static fromBoard(board: BoardPayload, nowMs: number): TickerComparison {
    const nowS = Math.floor(nowMs / 1000);
    const cashPrice = board.equity.priceUsd;
    const cash: CashLeg = {
      label: board.equity.label,
      feedSymbol: this.feedSymbol(board.equity),
      feedId: board.equity.feedId,
      priceUsd: cashPrice,
      confidenceUsd: board.equity.confidenceUsd,
      status: cashPrice === null ? "unavailable" : board.session.cashOpen ? "regular_session" : "last_cash_print",
      source: this.source(board.equity),
      freshness: this.freshness(board.equity, nowS),
      missing: cashPrice === null ? (board.equity.note ?? "No cash print.") : null,
    };

    const wrappers = board.wrappers.map((mark) => this.wrapperLeg(board, mark, nowS));
    const quotes = board.routes.flatMap((card) =>
      card.quotes.map<VenueQuote>((quote) => ({
        wrapper: card.kind,
        symbol: card.label,
        venue: quote.venue,
        available: Boolean(quote.available && quote.effectiveUsdPerShare),
        effectiveUsdPerShare: quote.available ? quote.effectiveUsdPerShare : null,
        vsCashPct: this.vsCashPct(quote.available ? quote.effectiveUsdPerShare : null, cashPrice),
        priceImpactPct: quote.available ? quote.priceImpactPct : null,
        reason: quote.available ? null : quote.reason,
        url: quote.url,
      })),
    );
    const priced = quotes.filter((quote) => quote.available);
    const pick = board.cheapestHonest;

    const anyPrice = cashPrice !== null || wrappers.some((w) => w.priceUsd !== null);
    const comparable = wrappers.some((w) => w.vsCash !== null);
    const status = comparable ? "ok" : !anyPrice && priced.length === 0 ? "no_data" : "partial";

    const notes = [...BASE_NOTES];
    if (cash.status === "last_cash_print") {
      notes.push("US cash is closed: the cash price is the last cash print, not a live broker quote. Wrappers can keep trading.");
    }
    if ([cash.freshness, ...wrappers.map((w) => w.freshness)].some((f) => f.kind === "untimed_snapshot")) {
      notes.push("pyth-terminal-snapshot prices have no publish time. Set PYTH_API_KEY on the server for timestamped Hermes ticks.");
    }

    return {
      ticker: board.ticker,
      name: board.name,
      curated: TickerUniverse.isDemo(board.ticker),
      status,
      observedAt: new Date(board.fetchedAt).toISOString(),
      session: {
        name: board.session.name,
        cashOpen: board.session.cashOpen,
        label: board.session.label,
        detail: board.session.detail,
      },
      cash,
      wrappers,
      redemptionRate: board.redemptionRate
        ? { symbol: board.redemptionRate.symbol, value: board.redemptionRate.value, note: board.redemptionRate.note }
        : null,
      venues: {
        quoteSizeUsd: board.quoteSizeUsd,
        comparable: priced.length >= 2,
        cheapest: pick
          ? {
              wrapper: pick.wrapper,
              venue: pick.venue,
              effectiveUsdPerShare: pick.effectiveUsdPerShare,
              vsCashPct: pick.vsEquityBps === null ? null : pick.vsEquityBps / 100,
              claimCheapest: pick.claimCheapest,
              caveat: pick.caveat,
            }
          : null,
        quotes,
      },
      warnings: board.warnings,
      notes,
      links: { desk: `/?t=${board.ticker}`, json: `/api/agent/compare/${board.ticker}` },
    };
  }

  private static wrapperLeg(board: BoardPayload, mark: BoardMark & { peg: PegVsEquity }, nowS: number): WrapperLeg {
    const kind = mark.kind as WrapperKind;
    const card = board.routes.find((route) => route.kind === kind) ?? null;
    return {
      kind,
      symbol: card?.label ?? `${board.ticker}${kind === "xstock" ? "x" : "on"}`,
      issuer: mark.issuer,
      feedSymbol: this.feedSymbol(mark),
      feedId: mark.feedId,
      priceUsd: mark.priceUsd,
      confidenceUsd: mark.confidenceUsd,
      source: this.source(mark),
      freshness: this.freshness(mark, nowS),
      vsCash: this.vsCash(mark.peg),
      identity: {
        mint: card?.mint ?? null,
        decimals: card?.decimals ?? null,
        name: card?.name ?? null,
        nameSource:
          card?.nameSource === "xstocks" ? "xstocks-public-inventory" : card?.nameSource === "jupiter" ? "jupiter-token-search" : null,
      },
      missing: mark.priceUsd === null ? (mark.note ?? "No mark.") : null,
    };
  }

  private static vsCash(peg: PegVsEquity): WrapperLeg["vsCash"] {
    if (peg.sign === "unavailable" || peg.pct === null || peg.dollars === null) {
      return null;
    }
    return { pct: peg.pct, dollars: peg.dollars, direction: peg.sign };
  }

  private static vsCashPct(price: number | null, cash: number | null): number | null {
    if (price === null || cash === null) return null;
    const bps = PegMath.premiumBps(price, cash);
    return bps === null ? null : bps / 100;
  }

  private static feedSymbol(mark: BoardMark): string | null {
    return mark.symbol && mark.symbol !== "—" ? mark.symbol : null;
  }

  private static source(mark: BoardMark): AgentSource {
    if (mark.priceUsd === null) return "unavailable";
    return mark.source === "hermes" ? "pyth-hermes" : mark.source === "pyth-terminal" ? "pyth-terminal-snapshot" : "unavailable";
  }

  private static freshness(mark: BoardMark, nowS: number): Freshness {
    if (mark.priceUsd === null) {
      return { kind: "none", publishedAt: null, ageSeconds: null, stale: null };
    }
    if (!mark.publishTime) {
      return { kind: "untimed_snapshot", publishedAt: null, ageSeconds: null, stale: null };
    }
    const ageSeconds = Math.max(0, nowS - mark.publishTime);
    return {
      kind: "timestamped",
      publishedAt: new Date(mark.publishTime * 1000).toISOString(),
      ageSeconds,
      stale: ageSeconds > STALE_AFTER_SECONDS,
    };
  }
}
