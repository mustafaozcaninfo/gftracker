#!/usr/bin/env python3
"""Daily cron entry point — scrape prices + export web dashboard."""

from __future__ import annotations

import logging
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import yaml  # noqa: E402

from export_web import build_dashboard_payload, validate_export  # noqa: E402
from main import run_update, setup_logging  # noqa: E402
from models import ProductStore  # noqa: E402
from notify import notify_daily_summary, notify_scrape_failure  # noqa: E402

logger = logging.getLogger(__name__)


def main() -> int:
    setup_logging(verbose=False)
    config_path = ROOT / "config.yaml"

    try:
        summary = run_update(config_path=config_path, verbose=False)
    except Exception as exc:
        logger.exception("Scrape crashed")
        notify_scrape_failure(f"Scrape crashed: {exc}")
        return 1

    if not summary.get("scrape_complete"):
        reason = (
            "Incomplete scrape — deploy skipped "
            f"({summary.get('pages_failed', 0)} page failures)"
        )
        print(
            "Incomplete scrape — skipping notifications; "
            f"pages {summary['pages_scraped']}/{summary['total_pages']} "
            f"({summary.get('pages_failed', 0)} failed). Deploy will be skipped."
        )
        notify_scrape_failure(reason, summary=summary)
        return 2

    with config_path.open(encoding="utf-8") as handle:
        config = yaml.safe_load(handle) or {}
    store = ProductStore(config["output"]["db_path"])
    store.checkpoint_wal()
    data_dir = Path(config["output"]["db_path"]).parent
    web_data_dir = ROOT / "web" / "public" / "data"
    validate_export(web_data_dir)
    payload = build_dashboard_payload(store, scrape_meta=summary, data_dir=data_dir)
    notify_daily_summary(summary, payload["stats"])
    print(
        "Daily scrape finished: "
        f"{summary['products_found']} products, "
        f"{summary['price_changes']} price changes, "
        f"pages {summary['pages_scraped']}/{summary['total_pages']}, "
        f"web={summary.get('web_dashboard_path')}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
