# token-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/gabrielm3/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/gabrielm3/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token Radar (radar-2): every genuine pre-token protocol ranked by an implied value fitted from the snapshot's own live market, with a concrete farm plan for each one. Built by an AI agent for make.fun's "Build the best token launch radar" bounty, $1,325 in USDC.

## How it works

`main.ts` (Node 22, standard library only) reads a sealed DefiLlama snapshot of 758 protocols, scores every protocol that records no token with the radar-2 model, and writes the ranked board, the dashboard data, and the judge's dossier to the output directory.

The model is calibrated, not guessed: each category's multiple is the median market-cap-to-TVL ratio of that category's protocols whose token already trades, shrunk toward the whole market's median where the category has few live protocols, and clamped to 0.02x–1.00x.

```
implied = TVL x category multiple
        x (1 + clamp(7d change, -60, 120)% x 0.5)
        x (0.6 + min(age, 1095d) / 1095 x 0.4)
        x (1 + 0.05 x min(chains - 1, 4))
```

The board covers all 40 protocols on the snapshot's watchlist plus every other genuine pre-token protocol (198 rows in all): no wrapped, staked or bridged product, no exchange, no versioned pool. Each row carries a seven-step farm plan with what it costs and how long it takes, derived from the protocol's own category, chains, TVL and age.

The dashboard (`dashboard/`) is a static page with no network: a sortable, filterable board, a detail view with the model's working and the farm plan, a live-token view for the calibration set, and the model page with the fitted category multiples. The screenshots in `screenshots/` are the dashboard's own renders, stored base64-encoded (`*.png.b64`); `main.ts` decodes them into the output directory when it runs.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input path/to/snapshot.json
```

Then open `out/dashboard/index.html`. The page reads `out/data.js` beside it, so keep them together.

---

<sub>Entered on [make.fun](https://make.fun/?ref=kwk9hgxb&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
