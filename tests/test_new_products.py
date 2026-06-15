"""Tests for newly listed products detection."""

from __future__ import annotations

import tempfile
import unittest
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from models import Product, ProductStore, QATAR_TZ

QATAR = ZoneInfo("Asia/Qatar")


def _product(pid: str, price: float = 100.0) -> Product:
    return Product(
        product_id=pid,
        sku=f"SKU-{pid}",
        name=f"New Item {pid}",
        brand="TestBrand",
        current_price=price,
        old_price=price * 2,
        discount_percent=50,
        url=f"https://example.com/{pid}",
        timestamp=datetime.now(QATAR).isoformat(timespec="seconds"),
        page=1,
    )


class NewProductsTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.store = ProductStore(Path(self.tmp.name) / "test.db")
        self.run_id = self.store.start_scrape_run(total_pages=1)

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def test_get_new_products_uses_first_seen_at(self) -> None:
        self.store.record_daily_scrape([_product("old")], self.run_id)
        old_ts = (datetime.now(QATAR) - timedelta(days=10)).isoformat(timespec="seconds")
        with self.store._connect() as conn:
            conn.execute(
                "UPDATE products SET first_seen_at = ? WHERE product_id = ?",
                (old_ts, "old"),
            )

        recent_ts = datetime.now(QATAR).isoformat(timespec="seconds")
        with self.store._connect() as conn:
            conn.execute(
                """
                INSERT INTO products (
                    product_id, sku, name, brand, url, image_url, sizes_json,
                    gender, first_seen_at, last_seen_at, is_active
                ) VALUES (?, ?, ?, ?, ?, '', '[]', 'women', ?, ?, 1)
                """,
                (
                    "fresh",
                    "SKU-fresh",
                    "Fresh Item",
                    "TestBrand",
                    "https://example.com/fresh",
                    recent_ts,
                    recent_ts,
                ),
            )
            conn.execute(
                """
                INSERT INTO daily_prices (
                    product_id, scrape_run_id, price_date, current_price,
                    old_price, discount_percent, page, scraped_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    "fresh",
                    self.run_id,
                    self.store._today(),
                    120.0,
                    240.0,
                    50,
                    1,
                    recent_ts,
                ),
            )

        new_items = self.store.get_new_products(recent_hours=48, limit=50)
        ids = {item["product_id"] for item in new_items}
        self.assertIn("fresh", ids)
        self.assertNotIn("old", ids)
        self.assertEqual(self.store.count_new_products(recent_hours=48), 1)

    def test_count_excludes_inactive(self) -> None:
        recent_ts = datetime.now(QATAR).isoformat(timespec="seconds")
        old_ts = (datetime.now(QATAR) - timedelta(days=10)).isoformat(timespec="seconds")
        with self.store._connect() as conn:
            conn.execute(
                """
                INSERT INTO products (
                    product_id, sku, name, brand, url, image_url, sizes_json,
                    gender, first_seen_at, last_seen_at, is_active, removed_at
                ) VALUES (?, ?, ?, ?, ?, '', '[]', 'women', ?, ?, 0, ?)
                """,
                (
                    "gone",
                    "SKU-gone",
                    "Gone Item",
                    "TestBrand",
                    "https://example.com/gone",
                    recent_ts,
                    recent_ts,
                    recent_ts,
                ),
            )
            conn.execute(
                """
                INSERT INTO products (
                    product_id, sku, name, brand, url, image_url, sizes_json,
                    gender, first_seen_at, last_seen_at, is_active
                ) VALUES (?, ?, ?, ?, ?, '', '[]', 'women', ?, ?, 1)
                """,
                (
                    "active",
                    "SKU-active",
                    "Active Item",
                    "TestBrand",
                    "https://example.com/active",
                    recent_ts,
                    recent_ts,
                ),
            )

        self.assertEqual(self.store.count_new_products(recent_hours=48), 1)


if __name__ == "__main__":
    unittest.main()
