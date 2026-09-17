# PegLens — recording checklist

~60–90 seconds. Local is the source of truth until **HOSTED_URL** is filled in.

**HOSTED_URL:** TBD (Vercel GitHub App not installed — [github.com/apps/vercel](https://github.com/apps/vercel)).

## Setup

```bash
npm install && npm run dev
```

Desktop viewport (~1440×900). Start in **light** (default). No wallet. No API key.

## Tape

| # | Shot | Look for |
| --- | --- | --- |
| 1 | Land on [http://localhost:3000](http://localhost:3000) | **AAPL**. **Local / test** + **Not a broker**. Cash print is the hero. |
| 2 | Hold on the comparison table | Broker / cash · xStock · Ondo. Peg in bps vs cash. After hours / overnight / weekend → **Last cash print** on cash. |
| 3 | Pan to the right-rail ticket | Route kicker is **Cheapest honest route** only if quotes compare. CTA follows the lowest USD/share (Raydium when it wins; Jupiter if cheaper). AAPLon honesty line if Raydium has no pool. **Quotes never execute**. |
| 4 | Click the header theme control twice | Light → **Dark** → **System**. Click once more to return to **Light**. |
| 5 | Type `ZZZZ` in ticker search, submit | **No live prints**. No invented price, peg, pool, or CTA. |

Optional extra (if time): tap **TSLA** in most popular, then back to **AAPL**, to show live marks on a second name.

## Do not record

- A guessed hosted URL
- A wallet connect or a signed swap
- Invented fills, simulated quotes, or a “zero” where the board shows `—` / **No print**
