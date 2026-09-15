# WallStreet-v-PolyMarket

**Cross-Market Probability Arbitrage Dashboard** — a Next.js + TypeScript trading terminal that compares Polymarket prediction-market probabilities against a Black–Scholes-derived "Wall Street" probability for the same binary event (Fed decisions, BTC thresholds, SPX levels, election markets).

Each row shows the probability gap (`spread = polymarketYes − wallStreet`, in percentage points). Spreads above ±10pp are flagged as significant — a prediction market trading far from the options-implied probability is a potential pricing inefficiency.

**Live demo:** https://wallstreet-v-polymarket.vercel.app

## Architecture

```mermaid
flowchart LR
    subgraph Client
        UI[Dashboard UI<br/>SWR · 30s polling]
    end

    subgraph Next.js["Next.js API routes (Node.js runtime)"]
        POL[/api/polymarket]
        DER[/api/deribit]
        FED[/api/fedwatch]
        SPY[/api/spy-options]
        ARB[/api/arbitrage]
        ALR[/api/alerts]
    end

    subgraph External["External APIs"]
        GAMMA[Polymarket Gamma]
        D[Deribit public v2]
        CME[CME FedWatch]
        YH[Yahoo Finance options]
        WH[Slack/Discord webhook]
    end

    subgraph Caching
        C[fetch revalidate: 300s]
        DEMO[Demo fallback data]
    end

    UI --> ARB
    ARB --> POL --> GAMMA
    ARB --> DER --> D
    ARB --> FED --> CME
    ARB --> SPY --> YH
    ARB --> ALR --> WH
    POL & DER & FED & SPY --> C
    ARB -. fallback on failure .-> DEMO
```

`/api/arbitrage` fetches all four sources, runs `binaryCallProbability({S, K, T, r, sigma})` from `lib/black-scholes.ts` (N via a hand-rolled Abramowitz–Stegun `erf`, no extra dependency), and emits rows of `{event, polymarketPct, wallStreetPct, spread, sparkline, isSignificant, stale}`.

## Tech stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript strict · Tailwind CSS v4 · SWR (30s polling) · Recharts · Vitest

## Running the project

```bash
# 1. Clone
git clone https://github.com/Prad-Nanduri/WallStreet-v-PolyMarket.git
cd WallStreet-v-PolyMarket

# 2. Install
npm install

# 3. Dev server
npm run dev          # http://localhost:3000

# 4. Tests, lint, production build
npx vitest run       # Black–Scholes unit tests
npm run lint
npm run build
```

No environment variables are required — every data source falls back to built-in demo data on failure, and the on-screen **Demo/Live** toggle lets you preview without any network access.

### Optional env vars (`.env.example`)

| Variable | Effect |
| --- | --- |
| `ALERT_WEBHOOK_URL` | Slack or Discord incoming webhook. `/api/arbitrage` triggers `/api/alerts`, which posts once per event per day when \|spread\| ≥ 10pp. Absent → alerts no-op. |
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | Reserved for real historical spread persistence. Absent → pipeline is skipped and sparklines remain simulated. |

## API reference

| Route | Source | What it returns |
| --- | --- | --- |
| `GET /api/arbitrage` | Aggregator | Spread rows joining Polymarket markets to options-derived probabilities |
| `GET /api/polymarket` | Polymarket Gamma | Active markets matching fed/btc/spx/pol keywords, paginated & capped per category |
| `GET /api/deribit` | Deribit public v2 | BTC spot, nearest-strike mark IV, DVOL fallback |
| `GET /api/fedwatch` | CME FedWatch | Rate-probability forecasts — **demo values** (upstream API requires a license) |
| `GET /api/spy-options` | Yahoo Finance | SPY options chain; **demo values** when Yahoo rate-limits |
| `POST /api/alerts` | Slack/Discord webhook | `{sent}` — posts when a spread crosses ±10pp, rate-limited once/event/day |
| `GET /api/wallet?wallet=0x…` | Polymarket data-api | Public positions for a proxy wallet (read-only, no auth) |
| `POST /api/revalidate` | — | Drops the shared 5-minute `arb-data` fetch cache |

All external fetches use `next: { revalidate: 300, tags: ['arb-data'] }` (5-minute cache, manually clearable via `POST /api/revalidate`).

## Portfolio tracking

Positions are stored client-side in `localStorage` — no accounts or database required. Add them three ways on `/portfolio`:

- **Manual** — event, YES/NO side, size, average price
- **CSV upload** — `event,side,size,price` rows (price in 0-1 or cents)
- **Wallet import** — paste a `0x…` Polymarket proxy-wallet address; `/api/wallet` proxies Polymarket's public data-api (read-only, no credentials)

Positions mark-to-market against the active feed (fuzzy event-name match to the spread table), drive the Position P&L chart on `/analytics`, and every add/close is written to the activity log shown on the dashboard and `/history`.

## Known limitations

- **SPX ≈ SPY × 10** — strikes/spot are scaled from the SPY chain; dividends and settlement differ from real SPX options.
- **CME FedWatch is demo-only** — the official endpoint returns 401 without a market-data license; the route serves hardcoded probabilities until resolved.
- **Sparkline history is simulated** — a deterministic seeded random walk, unless `UPSTASH_*` persistence is configured.
- **Election (`pol`) rows use a flat 50% prior** — there's no options-market equivalent for elections, so the Wall Street leg is a hardcoded comparison marked `stale`.
- **Risk-free rate is hardcoded** at 4% (`r = 0.04`); should eventually come from a Treasury-yield feed.
- **Alert rate-limiting is in-memory** — resets on server restart; fine for the single-instance MVP.
- **Portfolio is client-side only** — positions live in browser localStorage; clearing site data removes them.
- **Position-to-event matching is fuzzy** — marks resolve by event-title match against the spread table; unmatched positions show "—".

## References

- [Polymarket Gamma API](https://docs.polymarket.com) — market metadata and implied probabilities
- [Deribit API docs](https://docs.deribit.com) — options chain, mark IV, DVOL
- [CME FedWatch](https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html) — FOMC rate probabilities (licensed)
- Black & Scholes (1973) — risk-neutral binary probability `e^{-rT}·N(d2)`

Built by [Prad Nanduri](https://github.com/Prad-Nanduri).
