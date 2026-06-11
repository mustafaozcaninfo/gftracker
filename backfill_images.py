#!/usr/bin/env python3
"""Backfill product images from offer pages — no full price re-scrape needed."""

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

    total_images = 0
    for page, page_products, total_pages in scraper.iter_pages():
        image_map = {p.product_id: p.image_url for p in page_products if p.image_url}
        updated = store.update_product_images(image_map)
        total_images += updated
        logger.info(
            "Page %s/%s — %s images on page, %s total updated",
            page,
            total_pages,
            len(image_map),
            total_images,
        )

    web_path = export_dashboard(config_path=ROOT / "config.yaml")
    print(f"Image backfill done: {total_images} products updated → {web_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
