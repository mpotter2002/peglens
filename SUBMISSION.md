# PegLens — judge path (one sitting)

Live **broker vs chain** desk for tokenized stocks on Solana.

Pick a ticker. Compare the US cash/equity mark to the xStock and Ondo wrappers. Read the premium or discount. Take the cheapest honest route among **Raydium, Jupiter, and Meteora**. Cheapest is the primary CTA only when quotes compare. Empty cells stay empty.

Hackathon: [Stocklana](https://hackathons.solana.com/hackathons/stocklana) · main track + Pyth bounty.

Recording checklist: [DEMO.md](./DEMO.md). Technical depth: [README.md](./README.md).

## Hosted

| | |
| --- | --- |
| **HOSTED_URL** | **TBD** |
| Why | Vercel hosted deploy is blocked until the [Vercel GitHub App](https://github.com/apps/vercel) is installed on [mpotter2002/peglens](https://github.com/mpotter2002/peglens). |

Do not treat a guessed `*.vercel.app` hostname as live. Run locally for this sitting.

## Run locally

No API keys. Node 20+.

```bash
npm install && npm run dev
```

Open [http://localhost:3000](http://localhost:3000). It lands on **AAPL**. Header chips: **Local / test** and **Not a broker**.

Optional API ping:

```bash
curl -s http://localhost:3000/api/health
curl -s http://localhost:3000/api/board/AAPL | head
```

`host.label` should read `Local / test`. `pythKeyConfigured` is `false` unless you set a key.

## 60-second smoke

1. **AAPL cash hero** — ticker is the title; the large number is the broker/cash print. Caption is **Broker / cash**. Source chip reads **Pyth Terminal snapshot** (or **Pyth Hermes** if `PYTH_API_KEY` is set).
2. **Comparison table** — three rows: **Broker / cash · xStock · Ondo**. Peg is in bps vs cash. `—` / **No print** / **No peg yet** means the venue missed, not a zero.
3. **Route ticket** — right rail. **Cheapest honest route** only when venues compare. Primary CTA is the lowest USD/share. **Raydium, Jupiter, and Meteora** listed as alternatives. Caption includes **Quotes never execute**.
4. **Theme toggle** — header control cycles **System → Light → Dark**. Default is **light**.
5. **ZZZZ empty** — type `ZZZZ` in ticker search (or open `/?t=ZZZZ`). **No live prints**. PegLens will not invent a price, peg, pool, or swap CTA.

If you are outside 09:30–16:00 ET, cash wears a **Last cash print** badge (hero + cash source). Wrappers keep quoting. That is expected.

## Honesty limits

| Limit | What that means |
| --- | --- |
| Not a broker | Header chip stays on. No wallet, no custody, no account. |
| Quotes never execute | Raydium / Jupiter / Meteora numbers are indicative. CTAs open the venue. PegLens never signs or fills. |
| Overnight **Last cash print** | Outside regular US cash hours the cash column is a last print, not a live broker quote. Do not read it as a fillable bid/ask. |
| Honest empties | Missing Pyth marks, missing Raydium pools, and unknown tickers stay empty. `ROUTE_NOT_FOUND` is shown, not faked. |

PegLens does not invent prices or fills.
