import { Format } from "@/lib/ui/Format";
import type {
  BoardMark,
  BoardPayload,
  PegVsEquity,
  RouteVenue,
  SwapQuote,
  WrapperRouteCard,
} from "@/lib/types";

export type PegTone = "premium" | "discount" | "muted";

export type MarkColumn = {
  mark: BoardMark;
  peg: PegVsEquity | null;
  reference: boolean;
};

export class BoardView {
  static sourceCaption(board: BoardPayload): string {
    return board.pythKeyConfigured ? "Pyth Hermes" : "Pyth Terminal snapshot";
  }

  static quoteSizeCaption(board: BoardPayload): string {
    return `Quotes never execute · $${board.quoteSizeUsd} USDC sample size`;
  }

  static lastCashPrint(mark: BoardMark, sessionClosed: boolean): boolean {
    return mark.kind === "equity" && sessionClosed && mark.priceUsd !== null;
  }

  static sourceOrSession(mark: BoardMark, sessionClosed: boolean): string {
    if (this.lastCashPrint(mark, sessionClosed)) {
      return "Last cash print";
    }
    return mark.source === "unavailable" ? "unavailable" : mark.source;
  }

  static printAge(mark: BoardMark): string {
    if (mark.priceUsd === null) {
      return "No print";
    }
    if (mark.publishTime) {
      return `${mark.symbol} · ${Format.relative(mark.publishTime)}`;
    }
    if (mark.source === "pyth-terminal") {
      return `${mark.symbol} · terminal snapshot`;
    }
    return mark.symbol;
  }

  static heroCaption(mark: BoardMark): string {
    if (mark.priceUsd === null) {
      return "No cash print";
    }
    const age = mark.publishTime
      ? Format.relative(mark.publishTime)
      : mark.source === "pyth-terminal"
        ? "terminal snapshot"
        : mark.source;
    return `Broker / cash · ${age}`;
  }

  static printMeta(mark: BoardMark): string {
    if (mark.priceUsd === null) {
      return "No print";
    }
    if (mark.publishTime) {
      return Format.relative(mark.publishTime);
    }
    if (mark.source === "pyth-terminal") {
      return "snapshot";
    }
    return mark.source;
  }

  static rowNote(mark: BoardMark): string | null {
    if (!mark.note) {
      return null;
    }
    if (/Pyth Terminal public snapshot/i.test(mark.note)) {
      return null;
    }
    return mark.note;
  }

  static pegCopy(peg: PegVsEquity | null, compact = false): string {
    if (!peg) {
      return compact ? "Reference" : "Reference mark for every wrapper on this board.";
    }
    if (peg.sign === "unavailable") {
      return "No peg yet";
    }
    if (peg.sign === "flat") {
      return `In line · ${Format.bps(peg.bps)} vs cash`;
    }
    return `${Format.bps(peg.bps)} vs cash · ${Format.usd(peg.dollars, 2)}`;
  }

  static pegTone(peg: PegVsEquity | null): PegTone {
    if (peg?.sign === "premium") {
      return "premium";
    }
    if (peg?.sign === "discount") {
      return "discount";
    }
    return "muted";
  }

  static noLivePrints(board: BoardPayload): boolean {
    return board.equity.priceUsd === null && board.wrappers.every((wrapper) => wrapper.priceUsd === null);
  }

  static emptyTitle(): string {
    return "No live prints";
  }

  static emptyBody(ticker: string): string {
    return `Pyth did not return a cash, xStock, or Ondo mark for ${ticker}. PegLens will not invent a price. Try AAPL, or set PYTH_API_KEY for signed Hermes ticks.`;
  }

  static routeHeadline(board: BoardPayload): string {
    return board.cheapestHonest?.headline ?? "No executable route right now — PegLens will not invent a pool";
  }

  static routeKicker(board: BoardPayload): string {
    if (!board.cheapestHonest) {
      return "No swap CTA";
    }
    if (board.cheapestHonest.claimCheapest) {
      return "Cheapest honest route";
    }
    const venue = board.cheapestHonest.venue;
    const venueName = venue === "raydium" ? "Raydium" : venue === "jupiter" ? "Jupiter" : "dFlow";
    return `Trade on ${venueName}`;
  }

  static routeStory(board: BoardPayload): string {
    const featured = board.cheapestHonest;
    if (!featured) {
      return "PegLens will not invent a pool or a fill. Empty route cells stay empty.";
    }
    if (!featured.claimCheapest) {
      return "This is a venue quote, not a cheapest claim. PegLens only heard one executable venue at this size.";
    }
    if (featured.venue === "raydium") {
      return "Raydium quoted the lowest executable USD/share at this size. Other venues stay listed so you can compare.";
    }
    return "This CTA follows the lowest quoted USD/share. Raydium is listed when it has a pool — PegLens will not hide it.";
  }

  static ctaLabel(board: BoardPayload): string | null {
    return board.cheapestHonest?.ctaUrl ? board.cheapestHonest.ctaLabel : null;
  }

  static quoteLine(quote: SwapQuote): string {
    if (!quote.available) {
      return quote.reason ?? "No venue quoted — not a simulated fill.";
    }
    return `${Format.usd(quote.effectiveUsdPerShare, 2)} · ${quote.hopLabels.join(" → ") || "direct"}`;
  }

  static emptyQuotes(): string {
    return "No venue quoted — not a simulated fill.";
  }

  static venueLabel(venue: RouteVenue): string {
    return venue;
  }

  static columns(board: BoardPayload): MarkColumn[] {
    return [
      { mark: board.equity, peg: null, reference: true },
      ...board.wrappers.map((wrapper) => ({ mark: wrapper, peg: wrapper.peg, reference: false })),
    ];
  }

  static featuredMetrics(board: BoardPayload): string | null {
    const featured = board.cheapestHonest;
    if (!featured) {
      return null;
    }
    const vsCash = featured.vsEquityBps !== null ? ` · ${Format.bps(featured.vsEquityBps)} vs cash mark` : "";
    return `${Format.usd(featured.effectiveUsdPerShare, 2)} / share${vsCash} · ${featured.caveat}`;
  }

  static routeCards(board: BoardPayload): WrapperRouteCard[] {
    return board.routes;
  }
}
