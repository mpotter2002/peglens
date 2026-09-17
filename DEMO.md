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
| 1 | Land on [http://localhost:3000](http://localhost:3000) | **Most popular** list is the home. **Local / test** + **Not a broker**. |
| 2 | Open **AAPL** from the list | Desk drill-in. Company label, cash hero, three mark cards, session strip, venue comparison. After hours → **Last cash print**. |
| 3 | Pan venue comparison + right-rail ticket | Cheapest is the big CTA. Raydium + Jupiter + Meteora listed, cheapest first / highlighted. No cheapest label unless quotes compare. **Quotes never execute**. |
| 4 | Click the header theme control twice | Light → **Dark** → **System**. Click once more to return to **Light**. |
| 5 | Type `ZZZZ` in ticker search, submit | **No live prints**. No invented price, peg, pool, or CTA. |

Optional extra (if time): tap **TSLA** in most popular, then back to **AAPL**, to show live marks on a second name.

## Do not record

- A guessed hosted URL
- A wallet connect or a signed swap
- Invented fills, simulated quotes, or a “zero” where the board shows `—` / **No print**
