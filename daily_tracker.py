#!/usr/bin/env python3
"""Daily cron entry point — scrape prices + export web dashboard."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import yaml  # noqa: E402

from export_web import build_dashboard_payload, export_dashboard  # noqa: E402
from main import run_update  # noqa: E402
from models import ProductStore  # noqa: E402
from notify import notify_daily_summary  # noqa: E402


def main() -> int:
    config_path = ROOT / "config.yaml"
    summary = run_update(config_path=config_path, verbose=False)
    export_dashboard(config_path=config_path, scrape_meta=summary)

    with config_path.open(encoding="utf-8") as handle:
        config = yaml.safe_load(handle) or {}
    store = ProductStore(config["output"]["db_path"])
    store.checkpoint_wal()
    data_dir = Path(config["output"]["db_path"]).parent
    payload = build_dashboard_payload(store, scrape_meta=summary, data_dir=data_dir)
    notify_daily_summary(summary, payload["stats"])
    print(
        "Daily scrape finished: "
        f"{summary['products_found']} products, "
        f"{summary['price_changes']} price changes, "
        f"pages {summary['pages_scraped']}/{summary['total_pages']}, "
        f"web={summary.get('web_dashboard_path')}"
    )
    failed = int(summary.get("pages_failed", 0) or 0)
    total = int(summary.get("total_pages", 0) or 0)
    if failed == 0:
        return 0
    # Allow deploy when the catalog scrape is nearly complete (e.g. transient 503s).
    if total > 0 and failed / total <= 0.05:
        return 0
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
