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

    def test_sold_recent_uses_qatar_cutoff(self) -> None:
        now_qatar = datetime.now(QATAR_TZ)
        recent = (now_qatar - timedelta(hours=2)).isoformat(timespec="seconds")
        old = (now_qatar - timedelta(hours=30)).isoformat(timespec="seconds")

        with self.store._connect() as conn:
            conn.execute(
                """
                INSERT INTO products (
                    product_id, sku, name, brand, url,
                    first_seen_at, last_seen_at, is_active, removed_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
                """,
                ("recent", "R1", "Recent", "B", "https://x", recent, recent, recent),
            )
            conn.execute(
                """
                INSERT INTO products (
                    product_id, sku, name, brand, url,
                    first_seen_at, last_seen_at, is_active, removed_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
                """,
                ("old", "O1", "Old", "B", "https://x", old, old, old),
            )

        recent_sold = self.store.get_sold_products(limit=10, recent_hours=24)
        ids = {row["product_id"] for row in recent_sold}
        self.assertIn("recent", ids)
        self.assertNotIn("old", ids)
        self.assertEqual(self.store.count_sold_products(recent_hours=24), 1)


if __name__ == "__main__":
    unittest.main()
