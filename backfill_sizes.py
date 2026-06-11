#!/usr/bin/env python3
"""Backfill product sizes from offer listing pages."""

from __future__ import annotations

import logging
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from export_web import export_dashboard
from main import setup_logging
from models import ProductStore
from scraper import OfferScraper

logger = logging.getLogger(__name__)


def main() -> int:
    setup_logging(verbose=False)
    config = yaml.safe_load((ROOT / "config.yaml").open(encoding="utf-8")) or {}
    config.setdefault("scraper", {})
    config["scraper"]["speed"] = "turbo"
    config["max_pages"] = 0

    store = ProductStore(config["output"]["db_path"])
    scraper = OfferScraper(config)

    total_updated = 0
    for page, page_products, total_pages in scraper.iter_pages():
        size_map = {p.product_id: p.sizes for p in page_products if p.sizes}
        updated = store.update_product_sizes(size_map)
        total_updated += updated
        logger.info(
            "Page %s/%s — %s sized on page, %s total updated",
            page,
            total_pages,
            len(size_map),
            total_updated,
        )

    web_path = export_dashboard(config_path=ROOT / "config.yaml")
    print(f"Size backfill done: {total_updated} products updated → {web_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
