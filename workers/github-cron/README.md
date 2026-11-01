# GFTracker GitHub Cron Worker

Cloudflare Worker that triggers the hourly scrape workflow on GitHub Actions.

## Schedule

- **Cron:** currently **paused** (`wrangler.jsonc` → empty `crons`). To resume: set `"crons": ["15 * * * *"]` and `npx wrangler deploy`.
- **When enabled:** `15 * * * *` (minute 15 of every hour, UTC)
- **Target:** `POST https://api.github.com/repos/mustafaozcaninfo/gftracker/actions/workflows/daily-tracker.yml/dispatches` with `{"ref":"main"}`

When **`SCRAPE_PAUSED`** is `true` in `wrangler.jsonc` (or repo file **`.gftracker-pause`** exists), scheduled runs and `/trigger` do **not** call GitHub.

Before dispatching, the worker probes `offer.html`. If the offer returns **404/410** (sale ended), it **skips** hourly GitHub runs and only dispatches once per day at **06:15 UTC** (~09:15 Qatar) until the page returns.

The workflow file `.github/workflows/daily-tracker.yml` listens for `workflow_dispatch` (and legacy `repository_dispatch` type `hourly-scrape`).

## Setup

```bash
cd workers/github-cron
npm ci
npx wrangler login
./setup-pat.sh          # stores GITHUB_PAT + runs dispatch smoke test
npx wrangler deploy
```

### GitHub PAT permissions

Fine-grained token for repo `mustafaozcaninfo/gftracker`:

- **Actions:** Read and write (required for `workflow_dispatch`)
- **Metadata:** Read

Do **not** use `repository_dispatch` for new setups — the worker uses the workflow dispatch API.

### Optional: `CRON_SECRET`

```bash
npx wrangler secret put CRON_SECRET
```

Manual trigger (with secret):

```bash
curl "https://gftracker-github-cron.<account>.workers.dev/trigger?secret=YOUR_SECRET"
```

## Manual test

```bash
# After deploy
curl -X POST "https://gftracker-github-cron.<account>.workers.dev/trigger"

# Or dispatch directly (same as the worker)
curl -X POST \
  -H "Authorization: Bearer $GITHUB_PAT" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/repos/mustafaozcaninfo/gftracker/actions/workflows/daily-tracker.yml/dispatches \
  -d '{"ref":"main"}'
```

Check **Actions** tab for a new “Hourly GF Tracker” run.

## Failure handling

- Worker `scheduled` handler logs non-OK GitHub responses to Cloudflare Workers logs
- Failed scrapes notify via Telegram/Discord from `daily_tracker.py` / workflow fallback step
- Monitor: Cloudflare dashboard → Workers → Logs, and GitHub Actions run history

## Deploy

Worker deploy is **manual** (not in GitHub Actions). Re-run after changing `src/index.ts` or `wrangler.jsonc`:

```bash
npx wrangler deploy
```
