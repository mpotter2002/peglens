# PegLens

Live **broker vs chain** board for tokenized stocks on Solana.

Pick a ticker. Compare the US cash/equity mark to the xStock and Ondo wrappers. Read the premium or discount. Take the cheapest honest route — **Raydium first**, with Jupiter as a labeled secondary when Raydium has no pool.

**Judges (one sitting):** [SUBMISSION.md](./SUBMISSION.md) · recording: [DEMO.md](./DEMO.md)

| | |
| --- | --- |
| Local | `npm install && npm run dev` → [http://localhost:3000](http://localhost:3000) (lands on **AAPL**) |
| **HOSTED_URL** | **TBD** — Vercel GitHub App is not installed on this repo yet ([install](https://github.com/apps/vercel)) |
| Keys | None required |

Hackathon: [Stocklana](https://hackathons.solana.com/hackathons/stocklana) · main track + Pyth bounty.

## How to test (60 seconds)

No API keys required. Empty cells are empty — PegLens does not invent prices or fills.

### Local

```bash
npm install && npm run dev
```

Open [http://localhost:3000](http://localhost:3000). It lands on **AAPL**.

Smoke:

```bash
curl -s http://localhost:3000/api/health
curl -s http://localhost:3000/api/board/AAPL | head
```

`host.label` should read `Local / test`. `pythKeyConfigured` is `false` unless you set a key.

### What you should see on AAPL

1. **Cash hero** + comparison table: **Broker / cash · xStock · Ondo**. Source chip is **Pyth Terminal snapshot** (or **Pyth Hermes** if `PYTH_API_KEY` is set).
2. Session badge. Outside 09:30–16:00 ET the cash column wears a **Last cash print** badge — wrappers keep quoting.
3. Peg in bps vs cash. `—` / **No print** / **No peg yet** means the venue did not return a tick, not a zero.
4. **Raydium ticket** (right rail, **Cheapest honest route**). **AAPLx** is usually Raydium (Jupiter often agrees by routing through Raydium CLMM). **AAPLon**: Raydium currently has no pool — the board says so and shows Jupiter if it quotes. Caption: **Quotes never execute**.
5. Header **theme toggle** cycles System → Light → Dark (default dark). **Local / test** (or **Vercel preview**) and **Not a broker** chips stay on. CTAs open the venue; PegLens never signs or fills.
6. Type **ZZZZ** in ticker search (or tap a popular chip, or `/?t=ZZZZ`) — honest empty, no invented print, peg, or pool.

If a mark or route is missing, that is the honest empty state. Try AAPL again, or set the optional Hermes key below.

### Optional Hermes key

Copy `.env.example` to `.env.local` and set `PYTH_API_KEY` for signed [Hermes](https://docs.pyth.network/price-feeds/core/api-instances-and-providers/hermes) ticks. Get a key at [app.pyth.com](https://app.pyth.com). Never commit it.

Without a key, PegLens still uses:

- Hermes `/v2/price_feeds` for feed ids + US cash session hours (public)
- [Pyth Terminal](https://app.pyth.com) snapshots for the printed prices
- Raydium Trade API + Jupiter Swap API for executable quotes

### Hosted preview (no secrets)

**HOSTED_URL: TBD.** GitHub → Vercel is blocked until the [Vercel GitHub App](https://github.com/apps/vercel) is installed on this repo. Do not invent a live URL. Use local until then.

Once the app is installed, this deploys as a stock Next.js app. **Do not add env vars** for the first preview — the demo is designed to run without `PYTH_API_KEY`.

1. [Import the GitHub repo on Vercel](https://vercel.com/new/clone?repository-url=https://github.com/mpotter2002/peglens).
2. Leave Environment Variables empty.
3. Deploy. Open the preview URL — same AAPL path as local. The chip should read **Vercel preview**.
4. Optional later: add `PYTH_API_KEY` on the Vercel project for signed Hermes ticks. Not required.

Hobby functions are capped at ~10s. PegLens times out upstreams (~2.5–3s) and renders honest empties instead of hanging.

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
| US cash open/closed | Pyth `market_hours` + NY clock | No |
| AAPLx swap | Raydium `compute/swap-base-in` | No — indicative quote |
| AAPLon swap | Raydium if a pool exists, else Jupiter | No — **ROUTE_NOT_FOUND** is shown |
| Fills / wallet / custody | — | Out of scope. CTA opens the venue. |

## Stack

Thin Next.js App Router app. Classes with static methods wrap public APIs. The first HTML paint is a skeleton; `/api/board/AAPL` loads live marks so a slow venue cannot blank the page. The desk uses shadcn/ui with a dark-first theme and a System → Light → Dark toggle (`peglens.theme`).

## Remaining gaps (v1)

- Hermes latest-price is authenticated since the Aug 2026 Pyth Core upgrade. Demo works without a key via Terminal snapshots; a key makes ticks stricter.
- dFlow quotes 403 without an API key — omitted rather than faked.
- Theme defaults to dark; the header toggle cycles System → Light → Dark. Preference stays in the browser.
- PreStocks / Tessera are link-outs only, as scoped.

Out of scope: Stocklana basket custody, Clawpump/Meteora DBC rebuilds, pitch decks.
