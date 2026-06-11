"""Orchestration layer for GFTracker."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import yaml

from export_web import export_dashboard
from models import ProductStore
from scraper import OfferScraper

logger = logging.getLogger(__name__)


def load_config(config_path: str | Path = "config.yaml") -> dict[str, Any]:
    path = Path(config_path)
    if not path.exists():
        raise FileNotFoundError(f"Config file not found: {path}")
    with path.open(encoding="utf-8") as handle:
        return yaml.safe_load(handle) or {}


def setup_logging(verbose: bool = False) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


def run_update(config_path: str | Path = "config.yaml", verbose: bool = False) -> dict[str, Any]:
    setup_logging(verbose)
    config = load_config(config_path)

    scraper = OfferScraper(config)
    store = ProductStore(config["output"]["db_path"])

    all_products = []
    all_ids: list[str] = []
    pages_ok = 0
    pages_failed = 0
    total_pages = 0
    changes = []
    new_products = 0
    price_changes = 0

    run_id = store.start_scrape_run(total_pages=0)

    try:
        for page, page_products, total in scraper.iter_pages():
            total_pages = total
            if page == 1:
                with store._connect() as conn:
                    conn.execute(
                        "UPDATE scrape_runs SET total_pages = ? WHERE id = ?",
                        (total_pages, run_id),
                    )
            if not page_products:
                pages_failed += 1
                continue
            pages_ok += 1
            all_products.extend(page_products)
            all_ids.extend(p.product_id for p in page_products)
            batch_changes, batch_stats = store.record_daily_scrape(
                page_products, run_id, finalize=False
            )
            changes.extend(batch_changes)
            new_products += batch_stats.new_products
            price_changes += batch_stats.price_changes
            store.update_scrape_run_progress(
                run_id, pages_scraped=pages_ok, products_found=len(all_products)
            )

        if pages_failed == 0 and total_pages > 0 and pages_ok >= total_pages:
            store.record_daily_scrape(
                [], run_id, finalize=True, all_seen_ids=list(dict.fromkeys(all_ids))
            )
        else:
            logger.warning(
                "Skipping sold/gone finalize: pages_ok=%s total_pages=%s pages_failed=%s",
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
    except Exception:
        store.complete_scrape_run(
            run_id,
            pages_scraped=pages_ok,
            products_found=len(all_products),
            status="failed",
        )
        raise

    products = all_products
    scrape_meta = {
        "total_pages": total_pages,
        "pages_scraped": pages_ok,
        "pages_failed": pages_failed,
        "products_found": len(all_products),
    }
    from models import ScrapeStats

    db_stats = ScrapeStats(
        pages_scraped=pages_ok,
        pages_failed=pages_failed,
        products_found=len(all_products),
        price_changes=price_changes,
        new_products=new_products,
        scrape_run_id=run_id,
    )
    snapshot_path = store.save_daily_snapshot(products, config["output"]["snapshot_dir"])

    for change in changes:
        logger.info(
            "Price change | %s | %s -> %s QAR | discount %s%% -> %s%%",
            change.name,
            change.old_current_price,
            change.new_current_price,
            change.old_discount_percent,
            change.new_discount_percent,
        )

    web_path = export_dashboard(
        config_path=config_path,
        scrape_meta=scrape_meta,
    )

    summary = {
        "products_found": scrape_meta["products_found"],
        "pages_scraped": scrape_meta["pages_scraped"],
        "pages_failed": scrape_meta["pages_failed"],
        "total_pages": scrape_meta["total_pages"],
        "new_products": db_stats.new_products,
        "price_changes": db_stats.price_changes,
        "buy_signals": len(store.get_buy_signals()),
        "scrape_run_id": run_id,
        "snapshot_path": str(snapshot_path),
        "web_dashboard_path": str(web_path),
        "db_path": config["output"]["db_path"],
    }

    logger.info(
        "Update complete: %s products, %s new, %s price changes, snapshot=%s",
        summary["products_found"],
        summary["new_products"],
        summary["price_changes"],
        snapshot_path,
    )
    return summary


def run_report(config_path: str | Path = "config.yaml", verbose: bool = False) -> dict[str, Any]:
    setup_logging(verbose)
    config = load_config(config_path)
    top_n = int(config.get("report", {}).get("top_n", 20))

    store = ProductStore(config["output"]["db_path"])
    best_deals = store.get_today_best_deals(top_n=top_n)
    price_changes = store.get_today_price_changes()
    buy_signals = store.get_buy_signals()

    return {
        "best_deals": best_deals,
        "price_changes": price_changes,
        "buy_signals": buy_signals,
        "top_n": top_n,
    }


def print_report(report: dict[str, Any]) -> None:
    print("\n=== Today's Best Discounts ===\n")
    if not report["best_deals"]:
        print("No products scraped today yet. Run with --update first.")
    else:
        for idx, deal in enumerate(report["best_deals"], start=1):
            print(
                f"{idx:>2}. [{deal['discount_percent']}% OFF] "
                f"{deal['brand']} - {deal['name']}\n"
                f"    QAR {deal['current_price']:.2f} (was {deal['old_price']:.2f})\n"
                f"    SKU: {deal['sku']} | Page: {deal['page']}\n"
                f"    {deal['url']}\n"
            )

    print("\n=== Buy Signals (at or near all-time low) ===\n")
    if not report.get("buy_signals"):
        print("No buy signals yet — need multiple days of tracking.")
    else:
        for deal in report["buy_signals"][:15]:
            lowest = deal.get("lowest_price", deal["current_price"])
            lowest_date = deal.get("lowest_date", "?")
            flag = "BUY NOW" if deal.get("is_at_lowest") else "NEAR LOW"
            print(
                f"[{flag}] {deal['brand']} - {deal['name']}\n"
                f"    Now: QAR {deal['current_price']:.2f} | "
                f"Lowest: QAR {lowest:.2f} on {lowest_date}\n"
            )

    print("\n=== Today's Price Changes ===\n")
    if not report["price_changes"]:
        print("No price changes recorded today.")
    else:
        for change in report["price_changes"]:
            direction = "down" if change["new_current_price"] < change["old_current_price"] else "up"
            print(
                f"- {change['name']}\n"
                f"  Price {direction}: QAR {change['old_current_price']:.2f} -> "
                f"{change['new_current_price']:.2f}\n"
                f"  Discount: {change['old_discount_percent']}% -> {change['new_discount_percent']}%\n"
            )
