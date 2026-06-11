#!/usr/bin/env python3
"""Daily cron entry point — scrape prices + export web dashboard."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from export_web import export_dashboard  # noqa: E402
from main import run_update  # noqa: E402


def main() -> int:
    summary = run_update(config_path=ROOT / "config.yaml", verbose=False)
    export_dashboard(config_path=ROOT / "config.yaml", scrape_meta=summary)
    print(
        "Daily scrape finished: "
        f"{summary['products_found']} products, "
        f"{summary['price_changes']} price changes, "
        f"pages {summary['pages_scraped']}/{summary['total_pages']}, "
        f"web={summary.get('web_dashboard_path')}"
    )
    return 0 if summary.get("pages_failed", 0) == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
