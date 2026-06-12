# GFTracker

Hourly price tracker for the [Galeries Lafayette Qatar offer page](https://www.galerieslafayette.qa/offer.html). Scrapes ~4,800 products across ~152 pages, stores price history in SQLite, and publishes a Next.js dashboard.

**Live:** https://gftracker.vercel.app  
**Repo:** https://github.com/mustafaozcaninfo/gftracker

## What it does

- Scrapes the full offer catalog on a schedule (Cloudflare Worker → GitHub Actions)
- Tracks daily prices, intraday changes, buy signals, and sold/gone products
- Exports split JSON files for the web UI (`web/public/data/`)
- Deploys to Vercel only after a **complete** scrape

## Quick start (local)

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd web && npm ci && cd ..

# Scrape + export (needs network; ~3–15 min)
python daily_tracker.py

# Or export only from existing DB
python tracker.py --export-web

# Web dev server
cd web && npm run dev
```

Open http://localhost:3000. Product data is read from `web/public/data/*.json`.

## Commands

| Command | Purpose |
|---------|---------|
| `python daily_tracker.py` | Hourly entry point (scrape → export → notify) |
| `python tracker.py --update` | Full scrape + export |
| `python tracker.py --export-web` | Export JSON from DB (no scrape) |
| `python tracker.py --report` | Terminal summary |
| `python run_full_scrape.py` | Long scrape with per-page checkpoints |
| `cd web && npm test` | Vitest (web unit tests) |
| `python -m unittest discover -s tests` | Python unit tests |

## Architecture (short)

```
Cloudflare Worker (hourly :15)
    → GitHub Actions workflow_dispatch
        → scrape (Python) → SQLite cache
        → export_web → web/public/data/*.json
        → next build → vercel deploy --prod
```

Vercel Git auto-deploy is disabled (`vercel.json` `ignoreCommand`) so production data always comes from the scrape workflow.

See **[SYSTEM.md](./SYSTEM.md)** for database schema, sold detection, deploy paths, and page map.

## Secrets

Copy [`.env.example`](./.env.example) for local reference. Production secrets live in GitHub Actions / Cloudflare:

| Secret | Where | Purpose |
|--------|-------|---------|
| `VERCEL_TOKEN` | GitHub Actions | Production deploy |
| `TELEGRAM_BOT_TOKEN` | GitHub Actions | Scrape notifications |
| `TELEGRAM_CHAT_ID` | GitHub Actions | Scrape notifications |
| `DISCORD_WEBHOOK_URL` | GitHub Actions | Scrape notifications |
| `GITHUB_PAT` | Cloudflare Worker | Trigger `workflow_dispatch` |

Hourly cron worker: see [workers/github-cron/README.md](./workers/github-cron/README.md).

## Project layout

```
├── scraper.py, models.py, main.py, export_web.py   # Python backend
├── daily_tracker.py                                  # CI entry point
├── data/                                             # SQLite + snapshots (gitignored DB)
├── web/                                              # Next.js 15 dashboard
├── workers/github-cron/                              # Cloudflare cron → GitHub
├── .github/workflows/daily-tracker.yml               # Scrape + deploy
└── .github/workflows/ci.yml                          # PR checks
```

## CI

- **Pull requests / pushes to `main`:** `.github/workflows/ci.yml` — Python smoke + unit tests, `npm test`, `npm run build`
- **Hourly production:** `.github/workflows/daily-tracker.yml` — full scrape, cache DB, deploy on success only

## License

Private project — all rights reserved unless stated otherwise.
