#!/usr/bin/env python3
"""Full catalog scrape — saves to DB after EVERY page (crash-safe)."""

from __future__ import annotations

import logging
import sys
import time
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from export_web import export_dashboard
from main import setup_logging
from models import Product, ProductStore
from scraper import OfferScraper

logger = logging.getLogger(__name__)


def scrape_and_save(config: dict, export_every: int = 20) -> dict:
    scraper = OfferScraper(config)
    store = ProductStore(config["output"]["db_path"])

    all_products: list[Product] = []
    all_ids: list[str] = []
    pages_ok = 0
    pages_failed = 0
    total_pages = 0
    total_changes = 0
    total_new = 0

    run_id = store.start_scrape_run(total_pages=0)

    try:
        for page, page_products, total in scraper.iter_pages():
            total_pages = total
            if not page_products:
                pages_failed += 1
                continue

            pages_ok += 1
            all_products.extend(page_products)
            all_ids.extend(p.product_id for p in page_products)

            changes, stats = store.record_daily_scrape(page_products, run_id)
            total_changes += stats.price_changes
            total_new += stats.new_products

            store.update_scrape_run_progress(
                run_id,
                pages_scraped=pages_ok,
                products_found=len(all_products),
            )

            if page == 1:
                with store._connect() as conn:
                    conn.execute(
                        "UPDATE scrape_runs SET total_pages = ? WHERE id = ?",
                        (total_pages, run_id),
                    )

            if page % export_every == 0 or page == total_pages:
                export_dashboard(
                    config_path=ROOT / "config.yaml",
                    scrape_meta={
                        "total_pages": total_pages,
                        "pages_scraped": pages_ok,
                        "pages_failed": pages_failed,
                        "products_found": len(all_products),
                    },
                )
                logger.info(
                    "Checkpoint page %s/%s — %s products in DB",
                    page,
                    total_pages,
                    len(all_products),
                )

        scrape_complete = (
            pages_failed == 0 and total_pages > 0 and pages_ok >= total_pages
        )
        if scrape_complete:
            diff = store.finalize_scrape_catalog(
                list(dict.fromkeys(all_ids)),
                run_id=run_id,
            )
            logger.info(
                "Catalog diff (%s): %s removed, %s added",
                diff.get("baseline"),
                diff.get("removed"),
                diff.get("added"),
            )
        else:
            logger.warning(
                "Skipping catalog diff: pages_ok=%s total_pages=%s pages_failed=%s",
                pages_ok,
                total_pages,
                pages_failed,
            )

        store.complete_scrape_run(
            run_id,
            pages_scraped=pages_ok,
            products_found=len(all_products),
            status="completed" if pages_failed == 0 else "partial",
        )
        store.save_daily_snapshot(all_products, config["output"]["snapshot_dir"])

        web_path = None
        if scrape_complete:
            web_path = export_dashboard(
                config_path=ROOT / "config.yaml",
                scrape_meta={
                    "total_pages": total_pages,
                    "pages_scraped": pages_ok,
                    "pages_failed": pages_failed,
                    "products_found": len(all_products),
                    "scrape_complete": True,
                },
            )
        else:
            logger.warning("Skipping final web export — incomplete scrape")

        return {
            "total_pages": total_pages,
            "pages_scraped": pages_ok,
            "pages_failed": pages_failed,
            "scrape_complete": scrape_complete,
            "products_found": len(all_products),
            "new_products": total_new,
            "price_changes": total_changes,
            "scrape_run_id": run_id,
            "web_dashboard_path": str(web_path) if web_path else None,
        }
    except Exception:
        store.complete_scrape_run(
            run_id,
            pages_scraped=pages_ok,
            products_found=len(all_products),
            status="failed",
        )
        raise


def main() -> int:
    setup_logging(verbose=False)
    config = yaml.safe_load((ROOT / "config.yaml").open(encoding="utf-8")) or {}

    config.setdefault("scraper", {})
    if "speed" not in config["scraper"]:
        config["scraper"]["speed"] = "turbo"
    config["max_pages"] = 0

    started = time.time()
    try:
        summary = scrape_and_save(config)
    except Exception as exc:
        logger.exception("Full scrape failed")
        print(f"\nFAILED: {exc}\n", file=sys.stderr)
        return 1
    elapsed = round(time.time() - started, 1)

    print(
        f"\nDONE in {elapsed}s\n"
        f"  Pages: {summary['pages_scraped']}/{summary['total_pages']}\n"
        f"  Products: {summary['products_found']}\n"
        f"  New: {summary['new_products']}\n"
        f"  Web: {summary['web_dashboard_path']}\n"
    )
    return 0 if summary.get("scrape_complete") else 1


if __name__ == "__main__":
    raise SystemExit(main())
