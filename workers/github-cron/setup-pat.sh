#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

PAT_URL="https://github.com/settings/personal-access-tokens/new?name=GFTracker+Cloudflare+Cron&description=Hourly+repository_dispatch+for+gftracker&target_name=mustafaozcaninfo&expires_in=365&actions=write&metadata=read"

echo "GitHub fine-grained PAT formu aciliyor..."
echo "1) Repository access: Only select repositories -> gftracker"
echo "2) Generate token -> token'i kopyala"
echo "3) Buraya yapistir (ekranda gorunmez)"
echo

if command -v open >/dev/null 2>&1; then
  open "$PAT_URL"
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$PAT_URL"
else
  echo "$PAT_URL"
fi

read -r -s -p "GitHub PAT: " GITHUB_PAT
echo

if [[ -z "${GITHUB_PAT// }" ]]; then
  echo "Token bos, iptal." >&2
  exit 1
fi

if [[ ! "$GITHUB_PAT" =~ ^github_pat_ ]]; then
  echo "Uyari: fine-grained token genelde github_pat_ ile baslar." >&2
fi

echo "$GITHUB_PAT" | npx wrangler secret put GITHUB_PAT

echo "Test ediliyor..."
curl -fsS -X POST \
  -H "Authorization: Bearer $GITHUB_PAT" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/repos/mustafaozcaninfo/gftracker/dispatches \
  -d '{"event_type":"hourly-scrape","client_payload":{"source":"pat-setup-test"}}' \
  >/dev/null

echo "Tamam — GITHUB_PAT Cloudflare Worker'a kaydedildi ve dispatch testi gecti."
