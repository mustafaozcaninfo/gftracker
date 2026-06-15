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

from export_web import (  # noqa: E402
    build_dashboard_payload,
    export_dashboard,
    scrape_meta_from_last_run,
    validate_export,
)
from main import run_update, setup_logging  # noqa: E402
from models import ProductStore  # noqa: E402
from notify import notify_daily_summary, notify_scrape_failure  # noqa: E402

logger = logging.getLogger(__name__)


def _fallback_export(config_path: Path) -> bool:
    """Re-export JSON from cached SQLite so deploy can continue after a failed scrape."""
    web_data_dir = ROOT / "web" / "public" / "data"
    try:
        export_dashboard(
            config_path=config_path,
            scrape_meta=scrape_meta_from_last_run(config_path),
        )
        validate_export(web_data_dir)
        logger.warning("Fallback export succeeded from cached database")
        return True
    except Exception:
        logger.exception("Fallback export failed")
        return False


def main() -> int:
    setup_logging(verbose=False)
    config_path = ROOT / "config.yaml"

    try:
        summary = run_update(config_path=config_path, verbose=False)
    except Exception as exc:
        logger.exception("Scrape crashed")
        if _fallback_export(config_path):
            notify_scrape_failure(
                f"Scrape crashed ({exc}) — kept site online with last cached catalog."
            )
            print(
                "Scrape crashed but fallback export succeeded — deploy will continue."
            )
            return 0
        notify_scrape_failure(f"Scrape crashed: {exc}")
        return 1

    if not summary.get("scrape_complete"):
        reason = (
            "Incomplete scrape — deploy skipped "
            f"({summary.get('pages_failed', 0)} page failures)"
        )
        if _fallback_export(config_path):
            notify_scrape_failure(
                f"{reason} — redeployed last exportable catalog from cache.",
                summary=summary,
            )
            print(
                "Incomplete scrape — fallback export succeeded; deploy will continue. "
                f"pages {summary['pages_scraped']}/{summary['total_pages']} "
                f"({summary.get('pages_failed', 0)} failed)."
            )
            return 0
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
