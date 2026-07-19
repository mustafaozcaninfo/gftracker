"""Phase 3 backend tests — price change dedup and Qatar sold window."""

from __future__ import annotations

import tempfile
import unittest
from datetime import datetime, timedelta
from pathlib import Path
from unittest.mock import patch
from zoneinfo import ZoneInfo

from models import Product, ProductStore, QATAR_TZ

QATAR = ZoneInfo("Asia/Qatar")


def _product(pid: str, price: float) -> Product:
    return Product(
        product_id=pid,
        sku=f"SKU-{pid}",
        name=f"Item {pid}",
        brand="TestBrand",
        current_price=price,
        old_price=price * 2,
        discount_percent=50,
        url=f"https://example.com/{pid}",
        timestamp=datetime.now(QATAR).isoformat(timespec="seconds"),
        page=1,
    )


class ProductStorePhase3Tests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.db_path = Path(self.tmp.name) / "test.db"
        self.store = ProductStore(self.db_path)
        self.run_id = self.store.start_scrape_run(total_pages=1)

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def test_price_change_dedup_same_day(self) -> None:
        first = _product("1", 100.0)
        second = _product("1", 90.0)

        with patch.object(ProductStore, "_today", return_value="2026-06-12"):
            with patch.object(ProductStore, "_yesterday", return_value="2026-06-11"):
                self.store.record_daily_scrape([first], self.run_id)
                self.store.record_daily_scrape([second], self.run_id)

        with self.store._connect() as conn:
            count = conn.execute(
                "SELECT COUNT(*) AS c FROM price_changes WHERE product_id = ?",
                ("1",),
            ).fetchone()["c"]
            row = conn.execute(
                """
                SELECT old_current_price, new_current_price
                FROM price_changes WHERE product_id = ?
                """,
                ("1",),
            ).fetchone()

        self.assertEqual(count, 1)
        self.assertIsNotNone(row)
        self.assertEqual(float(row["new_current_price"]), 90.0)

    def test_same_day_price_changes_keep_day_open(self) -> None:
        """Intraday hops must preserve the first old_* (day open), not last hop."""
        with patch.object(ProductStore, "_today", return_value="2026-06-12"):
            with patch.object(ProductStore, "_yesterday", return_value="2026-06-11"):
                self.store.record_daily_scrape([_product("1", 100.0)], self.run_id)
                self.store.record_daily_scrape([_product("1", 70.0)], self.run_id)
                self.store.record_daily_scrape([_product("1", 85.0)], self.run_id)

        with self.store._connect() as conn:
            row = conn.execute(
                """
                SELECT old_current_price, new_current_price
                FROM price_changes WHERE product_id = ?
                """,
                ("1",),
            ).fetchone()

        self.assertIsNotNone(row)
        self.assertEqual(float(row["old_current_price"]), 100.0)
        self.assertEqual(float(row["new_current_price"]), 85.0)

    def test_empty_sizes_do_not_wipe_existing(self) -> None:
        with_sizes = _product("1", 100.0)
        with_sizes.sizes = ["M", "L"]
        empty = _product("1", 100.0)
        empty.sizes = []

        self.store.record_daily_scrape([with_sizes], self.run_id)
        self.store.record_daily_scrape([empty], self.run_id)

        with self.store._connect() as conn:
            row = conn.execute(
                "SELECT sizes_json FROM products WHERE product_id = ?",
                ("1",),
            ).fetchone()
        self.assertEqual(row["sizes_json"], '["M", "L"]')

    def test_analytics_uses_latest_price_when_today_missing(self) -> None:
        product = _product("1", 150.0)

        with patch.object(ProductStore, "_today", return_value="2026-06-11"):
            self.store.record_daily_scrape([product], self.run_id)

        with patch.object(ProductStore, "_today", return_value="2026-06-12"):
            analytics = self.store.get_products_with_analytics()

        self.assertEqual(len(analytics), 1)
        self.assertEqual(analytics[0]["current_price"], 150.0)
        self.assertEqual(analytics[0]["price_date"], "2026-06-11")

    def test_sold_recent_uses_qatar_cutoff(self) -> None:
        now_qatar = datetime.now(QATAR_TZ)
        recent = (now_qatar - timedelta(hours=2)).isoformat(timespec="seconds")
        old = (now_qatar - timedelta(hours=30)).isoformat(timespec="seconds")
        run_id = self.store.start_scrape_run(total_pages=1)

        with self.store._connect() as conn:
            for pid, ts in (("recent", recent), ("old", old)):
                conn.execute(
                    """
                    INSERT INTO products (
                        product_id, sku, name, brand, url,
                        first_seen_at, last_seen_at, is_active, removed_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
                    """,
                    (pid, f"SKU-{pid}", pid, "B", "https://x", ts, ts, ts),
                )
                conn.execute(
                    """
                    INSERT INTO catalog_removals (product_id, removed_at, scrape_run_id)
                    VALUES (?, ?, ?)
                    """,
                    (pid, ts, run_id),
                )

        recent_sold = self.store.get_sold_products(limit=10, recent_hours=24)
        ids = {row["product_id"] for row in recent_sold}
        self.assertIn("recent", ids)
        self.assertNotIn("old", ids)
        self.assertEqual(self.store.count_sold_products(recent_hours=24), 1)


if __name__ == "__main__":
    unittest.main()
