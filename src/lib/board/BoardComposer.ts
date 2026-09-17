import { PegMath } from "@/lib/board/PegMath";
import { SessionClock } from "@/lib/market/SessionClock";
import { FeedResolver } from "@/lib/pyth/FeedResolver";
import { HermesClient } from "@/lib/pyth/HermesClient";
import { PythTerminalClient } from "@/lib/pyth/PythTerminalClient";
import { TickerUniverse } from "@/lib/catalog/TickerUniverse";
import { DemoHost } from "@/lib/demo/DemoHost";
import { MintResolver } from "@/lib/wrappers/MintResolver";
import { RaydiumRouter } from "@/lib/routes/RaydiumRouter";
import { JupiterRouter } from "@/lib/routes/JupiterRouter";
import { MeteoraRouter } from "@/lib/routes/MeteoraRouter";
import { RouteBoard } from "@/lib/routes/RouteBoard";
import { TtlCache } from "@/lib/cache/TtlCache";
import type {
  BoardMark,
  BoardPayload,
  PegVsEquity,
  PriceSource,
  SwapQuote,
  WrapperKind,
  WrapperRouteCard,
} from "@/lib/types";
import type { HermesFeed, HermesPrice } from "@/lib/pyth/HermesClient";

const QUOTE_USD = 100;

export class BoardComposer {
  static async compose(rawTicker: string): Promise<BoardPayload> {
    const ticker = TickerUniverse.normalize(rawTicker);
    try {
      return await TtlCache.remember(`board:${ticker}`, 6_000, () => this.build(ticker), {
        skipCache: (board) => this.isEmpty(board),
      });
    } catch {
      return this.unavailable(ticker, "Board could not reach Pyth or DEX quotes. Empty cells are empty — not estimates.");
    }
  }

  static unavailable(ticker: string, note?: string): BoardPayload {
    const session = SessionClock.snapshot();
    const message = note ?? "Live venues did not return a print.";
    const equity = this.missingMark("equity", "Broker / cash", "US listed equity", message);
    const xstock = this.missingMark("xstock", "xStock", "Backed / xStocks", message);
    const ondo = this.missingMark("ondo", "Ondo", "Ondo Global Markets", message);
    const peg = this.emptyPeg();
    const routes = [
      RouteBoard.card({ kind: "xstock", label: `${ticker}x`, mint: null, decimals: null, quotes: [] }),
      RouteBoard.card({ kind: "ondo", label: `${ticker}on`, mint: null, decimals: null, quotes: [] }),
    ];
    return {
      ticker,
      name: ticker,
      fetchedAt: Date.now(),
      demo: true,
      pythKeyConfigured: Boolean(HermesClient.apiKey()),
      host: DemoHost.snapshot(),
      session,
      equity,
      wrappers: [
        { ...xstock, peg },
        { ...ondo, peg },
      ],
      redemptionRate: null,
      quoteSizeUsd: QUOTE_USD,
      routes,
      cheapestHonest: null,
      warnings: [message],
    };
  }

  static isEmpty(board: BoardPayload): boolean {
    const noMarks =
      board.equity.priceUsd === null && board.wrappers.every((wrapper) => wrapper.priceUsd === null);
    const noRoutes = board.routes.every((route) => !route.featured);
    return noMarks && noRoutes;
  }

  private static async build(ticker: string): Promise<BoardPayload> {
    const warnings: string[] = [];
    const pythKeyConfigured = Boolean(HermesClient.apiKey());
    const inAtomic = String(QUOTE_USD * 10 ** MintResolver.USDC_DECIMALS);

    const marksPromise = this.loadMarks(ticker, pythKeyConfigured, warnings);
    const routesPromise = this.loadRoutes(ticker, inAtomic);

    const [{ feeds, equity, xstock, ondo }, routes] = await Promise.all([marksPromise, routesPromise]);

    const session = SessionClock.snapshot(
      new Date(),
      feeds.equity
        ? {
            isOpen: feeds.equity.isOpen ?? false,
            nextOpen: feeds.equity.nextOpen,
            nextClose: feeds.equity.nextClose,
          }
        : undefined,
    );

    const wrappers = [xstock, ondo].map((mark) => ({
      ...mark,
      peg: this.peg(mark, equity),
    }));

    if (!feeds.equity) {
      warnings.push(`No Pyth Equity.US.${ticker}/USD feed.`);
    }
    if (!feeds.xstock) {
      warnings.push(`No Pyth Crypto.${ticker}X/USD feed.`);
    }
    if (!feeds.ondo) {
      warnings.push(`No Pyth Crypto.${ticker}ON/USD feed.`);
    }

    return {
      ticker,
      name: feeds.name,
      fetchedAt: Date.now(),
      demo: true,
      pythKeyConfigured,
      host: DemoHost.snapshot(),
      session,
      equity,
      wrappers,
      redemptionRate: feeds.redemptionRate,
      quoteSizeUsd: QUOTE_USD,
      routes,
      cheapestHonest: this.honestRoute(routes, equity.priceUsd),
      warnings,
    };
  }

  private static async loadMarks(
    ticker: string,
    pythKeyConfigured: boolean,
    warnings: string[],
  ): Promise<{
    feeds: Awaited<ReturnType<typeof FeedResolver.resolve>> & {
      redemptionRate: BoardPayload["redemptionRate"];
    };
    equity: BoardMark;
    xstock: BoardMark;
    ondo: BoardMark;
  }> {
    const feeds = await FeedResolver.resolve(ticker);
    const feedList = [feeds.equity, feeds.xstock, feeds.ondo, feeds.redemption].filter(
      (feed): feed is HermesFeed => Boolean(feed),
    );
    const hermesPrices = await HermesClient.latestPrices(feedList.map((feed) => feed.id));
    if (pythKeyConfigured && hermesPrices.length === 0 && feedList.length > 0) {
      warnings.push("Pyth API key is set but Hermes latest prices did not return. Falling back to Pyth Terminal.");
    }

    const [equity, xstock, ondo] = await Promise.all([
      this.mark({
        kind: "equity",
        label: "Broker / cash",
        issuer: "US listed equity",
        feed: feeds.equity,
        hermesPrices,
      }),
      this.mark({
        kind: "xstock",
        label: "xStock",
        issuer: "Backed / xStocks",
        feed: feeds.xstock,
        hermesPrices,
      }),
      this.mark({
        kind: "ondo",
        label: "Ondo",
        issuer: "Ondo Global Markets",
        feed: feeds.ondo,
        hermesPrices,
      }),
    ]);

    const redemptionRate = feeds.redemption
      ? {
          symbol: feeds.redemption.symbol,
          value: this.priceFor(feeds.redemption, hermesPrices)?.priceUsd ?? (await this.terminalPrice(feeds.redemption.symbol)),
          source: (this.priceFor(feeds.redemption, hermesPrices) ? "hermes" : "pyth-terminal") as PriceSource,
          note: "xStock redemption rate vs cash. ~1.00 means the wrapper still claims one share.",
        }
      : null;

    return {
      feeds: {
        ...feeds,
        redemptionRate: redemptionRate
          ? {
              ...redemptionRate,
              source: redemptionRate.value === null ? "unavailable" : redemptionRate.source,
            }
          : null,
      },
      equity,
      xstock,
      ondo,
    };
  }

  private static async loadRoutes(ticker: string, inAtomic: string): Promise<WrapperRouteCard[]> {
    const [xMint, ondoMint] = await Promise.all([MintResolver.xstock(ticker), MintResolver.ondo(ticker)]);
    return Promise.all([
      this.routeCard("xstock", `${ticker}x`, xMint, inAtomic),
      this.routeCard("ondo", `${ticker}on`, ondoMint, inAtomic),
    ]);
  }

  private static missingMark(
    kind: BoardMark["kind"],
    label: string,
    issuer: string,
    note: string,
  ): BoardMark {
    return {
      kind,
      label,
      issuer,
      symbol: "—",
      feedId: null,
      priceUsd: null,
      confidenceUsd: null,
      publishTime: null,
      source: "unavailable",
      live: false,
      note,
    };
  }

  private static emptyPeg(): PegVsEquity {
    return { bps: null, pct: null, dollars: null, sign: "unavailable" };
  }

  private static async mark(params: {
    kind: BoardMark["kind"];
    label: string;
    issuer: string;
    feed: HermesFeed | null;
    hermesPrices: HermesPrice[];
  }): Promise<BoardMark> {
    if (!params.feed) {
      return this.missingMark(params.kind, params.label, params.issuer, "Pyth does not list this feed.");
    }
    const hermes = this.priceFor(params.feed, params.hermesPrices);
    if (hermes) {
      return {
        kind: params.kind,
        label: params.label,
        issuer: params.issuer,
        symbol: params.feed.symbol,
        feedId: params.feed.id,
        priceUsd: hermes.priceUsd,
        confidenceUsd: hermes.confidenceUsd,
        publishTime: hermes.publishTime,
        source: "hermes",
        live: true,
        note: null,
      };
    }
    const terminal = await PythTerminalClient.quote(params.feed.symbol);
    if (terminal) {
      return {
        kind: params.kind,
        label: params.label,
        issuer: params.issuer,
        symbol: params.feed.symbol,
        feedId: params.feed.id,
        priceUsd: terminal.priceUsd,
        confidenceUsd: null,
        publishTime: null,
        source: "pyth-terminal",
        live: true,
        note: "Pyth Terminal public snapshot. Set PYTH_API_KEY for signed Hermes ticks.",
      };
    }
    return {
      kind: params.kind,
      label: params.label,
      issuer: params.issuer,
      symbol: params.feed.symbol,
      feedId: params.feed.id,
      priceUsd: null,
      confidenceUsd: null,
      publishTime: null,
      source: "unavailable",
      live: false,
      note: "Feed exists but no public price tick landed.",
    };
  }

  private static priceFor(feed: HermesFeed, prices: HermesPrice[]): HermesPrice | null {
    const id = feed.id.replace(/^0x/, "").toLowerCase();
    return prices.find((price) => price.id.replace(/^0x/, "").toLowerCase() === id) ?? null;
  }

  private static async terminalPrice(symbol: string): Promise<number | null> {
    const quote = await PythTerminalClient.quote(symbol);
    return quote?.priceUsd ?? null;
  }

  private static peg(wrapper: BoardMark, equity: BoardMark): PegVsEquity {
    if (wrapper.priceUsd === null || equity.priceUsd === null) {
      return this.emptyPeg();
    }
    const bps = PegMath.premiumBps(wrapper.priceUsd, equity.priceUsd);
    const dollars = PegMath.dollars(wrapper.priceUsd, equity.priceUsd);
    return {
      bps,
      pct: bps === null ? null : bps / 100,
      dollars,
      sign: PegMath.sign(bps),
    };
  }

  private static async routeCard(
    kind: WrapperKind,
    label: string,
    mint: Awaited<ReturnType<typeof MintResolver.xstock>>,
    inAtomic: string,
  ): Promise<WrapperRouteCard> {
    if (!mint) {
      return RouteBoard.card({ kind, label, mint: null, decimals: null, quotes: [] });
    }
    try {
      const [raydium, jupiter, meteora] = await Promise.all([
        RaydiumRouter.quote({ outputMint: mint.mint, outDecimals: mint.decimals, inAtomic }),
        JupiterRouter.quote({ outputMint: mint.mint, outDecimals: mint.decimals, inAtomic }),
        MeteoraRouter.quote({ outputMint: mint.mint, outDecimals: mint.decimals, inAtomic }),
      ]);
      return RouteBoard.card({
        kind,
        label,
        mint: mint.mint,
        decimals: mint.decimals,
        quotes: [raydium, jupiter, meteora],
      });
    } catch {
      return RouteBoard.card({ kind, label, mint: mint.mint, decimals: mint.decimals, quotes: [] });
    }
  }

  static honestRoute(
    routes: WrapperRouteCard[],
    equityUsd: number | null,
  ): BoardPayload["cheapestHonest"] {
    const candidates = routes
      .map((card) => ({ card, quote: card.cheapest }))
      .filter((row): row is { card: WrapperRouteCard; quote: SwapQuote } =>
        Boolean(row.quote?.available && row.quote.effectiveUsdPerShare),
      );
    if (candidates.length === 0) {
      return null;
    }
    const bestPrice = Math.min(...candidates.map((row) => row.quote.effectiveUsdPerShare ?? Infinity));
    const winners = candidates.filter((row) => {
      const price = row.quote.effectiveUsdPerShare;
      if (!price || !Number.isFinite(bestPrice)) {
        return false;
      }
      return ((price - bestPrice) / bestPrice) * 10_000 <= 1;
    });
    const picked = winners.find((row) => row.quote.venue === "raydium") ?? winners[0];
    if (!picked) {
      return null;
    }
    const liveQuotes = routes.flatMap((card) =>
      card.quotes.filter((quote) => quote.available && quote.effectiveUsdPerShare),
    );
    const claimCheapest = liveQuotes.length >= 2;
    const vsEquityBps =
      equityUsd && picked.quote.effectiveUsdPerShare
        ? PegMath.premiumBps(picked.quote.effectiveUsdPerShare, equityUsd)
        : null;
    const venue = picked.quote.venue;
    const label = picked.card.label;
    const venueName = RouteBoard.venueTitle(venue);
    const headline = claimCheapest ? `Buy ${label} on ${venueName}` : `Trade ${label} on ${venueName}`;
    const caveat = claimCheapest
      ? "Indicative quote for $100 USDC in, 50 bps slippage. PegLens never fills or signs."
      : `Indicative ${venueName} quote for $100 USDC in, 50 bps slippage. Not a cheapest claim — PegLens only heard one venue. Never fills or signs.`;
    return {
      wrapper: picked.card.kind,
      venue,
      effectiveUsdPerShare: picked.quote.effectiveUsdPerShare ?? 0,
      vsEquityBps,
      headline,
      ctaLabel: `Open ${venueName} swap`,
      ctaUrl: picked.quote.url,
      caveat,
      claimCheapest,
    };
  }
}
