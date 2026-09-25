# xStockLens

Live **broker vs chain** board for tokenized stocks on Solana.

Pick a ticker. Compare the US cash/equity mark to the xStock and Ondo wrappers. Read the premium or discount. Take the cheapest honest route among **Raydium, Jupiter, and Meteora**. Raydium stays listed; cheapest is the primary CTA only when quotes compare. Empty cells stay empty.

**Judges (one sitting):** [SUBMISSION.md](./SUBMISSION.md) · recording: [DEMO.md](./DEMO.md)

| | |
| --- | --- |
| Local | `npm install && npm run dev` → [http://localhost:3000](http://localhost:3000) (lands on **most popular** list) |
| **Hosted** | [https://xstocklens.vercel.app](https://xstocklens.vercel.app) — production build of `main`, no keys set |
| Keys | None required |

Hackathon: [Stocklana](https://hackathons.solana.com/hackathons/stocklana) · main track + Pyth bounty.

## How to test (60 seconds)

No API keys required. Empty cells are empty — xStockLens does not invent prices or fills.

Fastest path: open [https://xstocklens.vercel.app](https://xstocklens.vercel.app) and follow **What you should see on AAPL** below. Nothing to install.

### Local

```bash
npm install && npm run dev
```

Open [http://localhost:3000](http://localhost:3000). It lands on the **most popular** ticker list. Open **AAPL** (or search) to drill into the desk.

Smoke:

```bash
curl -s http://localhost:3000/api/health
curl -s http://localhost:3000/api/board/AAPL | head
```

`host.label` should read `Local / test`. `pythKeyConfigured` is `false` unless you set a key.

### What you should see on AAPL

1. **Cash hero** with company label (Pyth feed name, else the demo catalog). Three mark cards: **Broker / cash · xStock · Ondo**, each with peg, Pyth feed id, and mint when known. Source is **Pyth Terminal snapshot** (or **Pyth Hermes** if `PYTH_API_KEY` is set).
2. Session strip. Outside 09:30–16:00 ET cash wears a **Last cash print** badge — wrappers keep quoting. That is a last print, not a live bid/ask.
3. Peg vs cash, as a percent of the cash price. `—` / **No print** / **No peg yet** means the venue did not return a tick, not a zero. **How to read this peg** is on the desk.
4. **Venue comparison** on the page (plus the right-rail CTA). **Cheapest honest route** only when quotes compare. Primary CTA is the lowest USD/share. **Raydium, Jupiter, and Meteora** are listed (honest empties if a venue has no pool). Caption: **Quotes never execute**.
5. Header **theme toggle** cycles System → Light → Dark (default **light**; saved preference wins). Host chip (**Hosted** on xstocklens.vercel.app, **Vercel preview** on preview deploys, **Local / test** on your machine) and **Not a broker** stay on. Wordmark returns **home**. xStockLens never signs or fills.
6. Type **ZZZZ** in ticker search (or tap a popular chip, or `/?t=ZZZZ`) — honest empty, no invented print, peg, or pool.

If a mark or route is missing, that is the honest empty state. Try AAPL again, or set the optional Hermes key below.

### Optional Hermes key

Copy `.env.example` to `.env.local` and set `PYTH_API_KEY` for signed [Hermes](https://docs.pyth.network/price-feeds/core/api-instances-and-providers/hermes) ticks. Get a key at [app.pyth.com](https://app.pyth.com). Never commit it.

Without a key, xStockLens still uses:

- Hermes `/v2/price_feeds` for feed ids + US cash session hours (public)
- [Pyth Terminal](https://app.pyth.com) snapshots for the printed prices
- Raydium Trade API + Jupiter Swap API for executable quotes. Meteora is a Jupiter quote restricted to Meteora hops (no invented pool).

### Hosted (no secrets)

Live at **[https://xstocklens.vercel.app](https://xstocklens.vercel.app)**. Vercel builds `main` to production and every PR to a preview URL. No environment variables are set — the hosted demo runs without `PYTH_API_KEY`, same as local.

- Production chip reads **Hosted**. PR preview deploys read **Vercel preview**.
- Smoke: `curl -s https://xstocklens.vercel.app/api/health` → `host.label` is `Hosted`, `pythKeyConfigured` is `false`.
- Optional later: add `PYTH_API_KEY` on the Vercel project for signed Hermes ticks. Not required.

Deploying your own copy: [import the repo on Vercel](https://vercel.com/new/clone?repository-url=https://github.com/mpotter2002/xstocklens), leave Environment Variables empty, deploy.

Hobby functions are capped at ~10s. xStockLens times out upstreams (~2.5–3s) and renders honest empties instead of hanging.

## Agent interface (MCP + JSON)

An AI agent can call the same comparison the desk shows. It is read-only: it never signs, trades, custodies, or holds a wallet.

| | |
| --- | --- |
| **MCP** (Streamable HTTP, stateless) | `POST https://xstocklens.vercel.app/api/mcp` |
| Tools | `compare_ticker { ticker }` · `list_supported_tickers {}` |
| JSON twin | `GET /api/agent/compare/AAPL` · `GET /api/agent/tickers` |

`compare_ticker` returns, for one US ticker:
- **Cash mark** with its session status. `regular_session`, or `last_cash_print` when US cash is closed (a last print, not a live quote).
- **xStock and Ondo marks**, each with premium/discount vs cash in % and $. This is the board's own peg math; the agent layer adds no formula of its own.
- **Wrapper identity**: Solana mint, decimals, and name source.
- **Source and freshness** for every price. `pyth-hermes` ticks carry a publish time and a `stale` flag; `pyth-terminal-snapshot` prices say they are untimed.
- **Redemption rate** and **indicative $100 USDC quotes** for Raydium, Jupiter and Meteora, with `comparable: true` only when two or more venues priced.

Missing data is `null` with a `missing`/`reason` string, never a zero or an estimate. `status` is `ok` (a premium/discount exists), `partial` (some data, no comparison) or `no_data`. There is no day-change or rolling-24h field.

Connect an MCP client (Claude Code shown):

```bash
claude mcp add --transport http xstocklens https://xstocklens.vercel.app/api/mcp
```

Or call it raw:

```bash
curl -s https://xstocklens.vercel.app/api/mcp -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"compare_ticker","arguments":{"ticker":"AAPL"}}}'
curl -s https://xstocklens.vercel.app/api/agent/compare/AAPL
```

Code: `src/lib/agent/AgentCompare.ts` (reshapes `BoardComposer` output), `src/lib/agent/McpServer.ts` (JSON-RPC), routes under `src/app/api/mcp` and `src/app/api/agent`.

## Checks

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

## What is real vs not

| Surface | Source | Invented? |
| --- | --- | --- |
| Equity / xStock / Ondo marks | Pyth (Hermes or Terminal) | No |
| Home list day % and sparklines | Yahoo 5-min closes vs prior close, beside the Pyth price (labeled on the page) | No — mixed sources, labeled |
| Agent API / MCP | Same `BoardComposer` payload as the desk | No — reshaped, not recomputed |
| US cash open/closed | Pyth `market_hours` + NY clock | No |
| AAPLx swap | Raydium, Jupiter, Meteora (Meteora-only hops) | No — indicative quote |
| AAPLon swap | Same three venues; Raydium often **ROUTE_NOT_FOUND** | No — missing pools stay empty |
| Fills / wallet / custody | — | Out of scope. CTA opens the venue. |

## Stack

Thin Next.js App Router app. Classes with static methods wrap public APIs. `/` is the popular-ticker home. A desk (`/?t=AAPL`) paints a skeleton, then `/api/board/AAPL` loads live marks so a slow venue cannot blank the page. The desk uses shadcn/ui with a light-first theme and a System → Light → Dark toggle (`peglens.theme`).

## Remaining gaps (v1)

- Hermes latest-price is authenticated since the Aug 2026 Pyth Core upgrade. Demo works without a key via Terminal snapshots; a key makes ticks stricter.
- dFlow quotes 403 without an API key — omitted rather than faked.
- Theme defaults to light; the header toggle cycles System → Light → Dark. Preference stays in the browser.
- PreStocks / Tessera are link-outs only, as scoped.

Out of scope: Stocklana basket custody, Clawpump/Meteora DBC rebuilds, pitch decks.
