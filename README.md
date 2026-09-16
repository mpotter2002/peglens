# PegLens

Live **broker vs chain** board for tokenized stocks on Solana.

Pick a ticker. Compare the US cash/equity mark to the xStock and Ondo wrappers. Read the premium or discount. Take the cheapest honest route — **Raydium first**, with Jupiter as a labeled secondary when Raydium has no pool.

Hackathon: [Stocklana](https://hackathons.solana.com/hackathons/stocklana) · main track + Pyth bounty.

## 60-second demo

1. `npm install && npm run dev`
2. Open [http://localhost:3000](http://localhost:3000) — it lands on **AAPL**.
3. Read the three marks: broker/cash · xStock · Ondo. After hours, the cash column wears a **last cash print** badge.
4. Check the peg (bps vs cash) and the **cheapest honest route**. For AAPLx this is usually Raydium (Jupiter often agrees by routing 100% through Raydium CLMM). For AAPLon, Raydium currently has no pool — the board says so and shows Jupiter/Meteora if it quotes.
5. Switch ticker from the rail. Nothing is a fill. The **Local / test** and **Not a broker** chips stay on.

## How to run

```bash
npm install
npm run dev
```

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Optional: copy `.env.example` to `.env.local` and set `PYTH_API_KEY` for signed [Hermes](https://docs.pyth.network/price-feeds/core/api-instances-and-providers/hermes) ticks. Without a key, PegLens still uses:

- Hermes `/v2/price_feeds` for feed ids + US cash session hours (public)
- [Pyth Terminal](https://app.pyth.com) snapshots for the printed prices
- Raydium Trade API + Jupiter Swap API for executable quotes

Never commit a key.

## What is real vs not

| Surface | Source | Invented? |
| --- | --- | --- |
| Equity / xStock / Ondo marks | Pyth (Hermes or Terminal) | No |
| US cash open/closed | Pyth `market_hours` + NY clock | No |
| AAPLx swap | Raydium `compute/swap-base-in` | No — indicative quote |
| AAPLon swap | Raydium if a pool exists, else Jupiter | No — **ROUTE_NOT_FOUND** is shown |
| Fills / wallet / custody | — | Out of scope. CTA opens the venue. |

## Stack

Thin Next.js App Router app. Classes with static methods wrap public APIs. No rebuilt AMMs, no basket custody, no fake prices.

## Remaining gaps (v1)

- Hermes latest-price is authenticated since the Aug 2026 Pyth Core upgrade. Demo works without a key via Terminal snapshots; a key makes ticks stricter.
- dFlow quotes 403 without an API key — omitted rather than faked.
- No hosted deploy in this PR (run locally or point Vercel at the branch).
- PreStocks / Tessera are link-outs only, as scoped.

Out of scope: Stocklana basket custody, Clawpump/Meteora DBC rebuilds, pitch decks.
