# PegLens

Live **broker vs chain** board for tokenized stocks on Solana.

Pick a ticker. Compare the US cash/equity mark to the xStock and Ondo wrappers. Read the premium or discount. Take the cheapest honest route among **Raydium, Jupiter, and Meteora**. Raydium stays listed; cheapest is the primary CTA only when quotes compare. Empty cells stay empty.

**Judges (one sitting):** [SUBMISSION.md](./SUBMISSION.md) · recording: [DEMO.md](./DEMO.md)

| | |
| --- | --- |
| Local | `npm install && npm run dev` → [http://localhost:3000](http://localhost:3000) (lands on **most popular** list) |
| **Hosted** | [https://peglens.vercel.app](https://peglens.vercel.app) — production build of `main`, no keys set |
| Keys | None required |

Hackathon: [Stocklana](https://hackathons.solana.com/hackathons/stocklana) · main track + Pyth bounty.

## How to test (60 seconds)

No API keys required. Empty cells are empty — PegLens does not invent prices or fills.

Fastest path: open [https://peglens.vercel.app](https://peglens.vercel.app) and follow **What you should see on AAPL** below. Nothing to install.

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
5. Header **theme toggle** cycles System → Light → Dark (default **light**; saved preference wins). Host chip (**Hosted** on peglens.vercel.app, **Vercel preview** on preview deploys, **Local / test** on your machine) and **Not a broker** stay on. Wordmark returns **home**. PegLens never signs or fills.
6. Type **ZZZZ** in ticker search (or tap a popular chip, or `/?t=ZZZZ`) — honest empty, no invented print, peg, or pool.

If a mark or route is missing, that is the honest empty state. Try AAPL again, or set the optional Hermes key below.

### Optional Hermes key

Copy `.env.example` to `.env.local` and set `PYTH_API_KEY` for signed [Hermes](https://docs.pyth.network/price-feeds/core/api-instances-and-providers/hermes) ticks. Get a key at [app.pyth.com](https://app.pyth.com). Never commit it.

Without a key, PegLens still uses:

- Hermes `/v2/price_feeds` for feed ids + US cash session hours (public)
- [Pyth Terminal](https://app.pyth.com) snapshots for the printed prices
- Raydium Trade API + Jupiter Swap API for executable quotes. Meteora is a Jupiter quote restricted to Meteora hops (no invented pool).

### Hosted (no secrets)

Live at **[https://peglens.vercel.app](https://peglens.vercel.app)**. Vercel builds `main` to production and every PR to a preview URL. No environment variables are set — the hosted demo runs without `PYTH_API_KEY`, same as local.

- Production chip reads **Hosted**. PR preview deploys read **Vercel preview**.
- Smoke: `curl -s https://peglens.vercel.app/api/health` → `host.label` is `Hosted`, `pythKeyConfigured` is `false`.
- Optional later: add `PYTH_API_KEY` on the Vercel project for signed Hermes ticks. Not required.

Deploying your own copy: [import the repo on Vercel](https://vercel.com/new/clone?repository-url=https://github.com/mpotter2002/peglens), leave Environment Variables empty, deploy.

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
