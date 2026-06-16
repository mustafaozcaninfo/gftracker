"""Tests for sold / removed products detection (catalog_removals)."""

from __future__ import annotations

import tempfile
import unittest
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

from models import ProductStore, QATAR_TZ

QATAR = ZoneInfo("Asia/Qatar")


def _insert_product(store: ProductStore, product_id: str, *, active: int = 1) -> None:
    ts = datetime.now(QATAR).isoformat(timespec="seconds")
    with store._connect() as conn:
        conn.execute(
            """
            INSERT INTO products (
                product_id, sku, name, brand, url,
                first_seen_at, last_seen_at, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                product_id,
                f"SKU-{product_id}",
                f"Item {product_id}",
                "Brand",
                "https://example.com",
                ts,
                ts,
                active,
            ),
        )


class CatalogRemovalsTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.store = ProductStore(Path(self.tmp.name) / "test.db")

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def test_catalog_diff_records_removals(self) -> None:
        for pid in ("keep", "gone"):
            _insert_product(self.store, pid)
        run_id = self.store.start_scrape_run(total_pages=1)

        diff = self.store.apply_catalog_diff(
            previous_ids={"keep", "gone"},
            current_ids={"keep"},
            run_id=run_id,
            baseline="snapshot:1",
        )

        self.assertEqual(diff["removed"], 1)
        self.assertEqual(diff["removals_recorded"], 1)
        with self.store._connect() as conn:
            row = conn.execute(
                "SELECT product_id FROM catalog_removals WHERE product_id = ?",
                ("gone",),
            ).fetchone()
        self.assertIsNotNone(row)

        sold = self.store.get_sold_products(limit=10)
        ids = {item["product_id"] for item in sold}
        self.assertIn("gone", ids)
        self.assertNotIn("keep", ids)
        self.assertEqual(self.store.count_sold_products(), 1)

    def test_bootstrap_does_not_record_removals(self) -> None:
        for pid in ("a", "b"):
            _insert_product(self.store, pid)
        run_id = self.store.start_scrape_run(total_pages=1)

        diff = self.store.apply_catalog_diff(
            previous_ids={"a", "b", "missing"},
            current_ids={"a"},
            run_id=run_id,
            baseline="active_db_bootstrap",
        )

        self.assertEqual(diff["removed"], 0)
        self.assertEqual(diff["removals_recorded"], 0)
        with self.store._connect() as conn:
            row = conn.execute(
                "SELECT is_active FROM products WHERE product_id = ?",
                ("b",),
            ).fetchone()
        self.assertEqual(int(row["is_active"]), 1)
        self.assertEqual(self.store.count_sold_products(), 0)

    def test_bulk_removals_per_run_are_skipped(self) -> None:
        previous = {f"p{i}" for i in range(500)}
        removed = {f"p{i}" for i in range(201)}
        current = previous - removed
        for pid in previous:
            _insert_product(self.store, pid)

        run_id = self.store.start_scrape_run(total_pages=1)
        diff = self.store.apply_catalog_diff(
            previous_ids=previous,
            current_ids=current,
            run_id=run_id,
            baseline="snapshot:1",
        )

        self.assertEqual(diff["removed"], 0)
        self.assertEqual(diff["removals_recorded"], 0)
        self.assertEqual(self.store.count_sold_products(), 0)

    def test_count_excludes_reactivated_products(self) -> None:
        recent_ts = datetime.now(QATAR).isoformat(timespec="seconds")
        _insert_product(self.store, "gone", active=0)
        _insert_product(self.store, "back", active=1)
        run_id = self.store.start_scrape_run(total_pages=1)
        with self.store._connect() as conn:
            conn.execute(
                """
                INSERT INTO catalog_removals (product_id, removed_at, scrape_run_id)
                VALUES (?, ?, ?), (?, ?, ?)
                """,
                ("gone", recent_ts, run_id, "back", recent_ts, run_id),
            )

        self.assertEqual(self.store.count_sold_products(), 1)
        self.assertEqual(self.store.count_sold_products(recent_hours=48), 1)

    def test_recent_window_uses_qatar_cutoff(self) -> None:
        now_qatar = datetime.now(QATAR_TZ)
        recent = (now_qatar - timedelta(hours=2)).isoformat(timespec="seconds")
        old = (now_qatar - timedelta(hours=30)).isoformat(timespec="seconds")
        run_id = self.store.start_scrape_run(total_pages=1)

        for pid, ts in (("recent", recent), ("old", old)):
            with self.store._connect() as conn:
                conn.execute(
                    """
                    INSERT INTO products (
                        product_id, sku, name, brand, url,
                        first_seen_at, last_seen_at, is_active, removed_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
                    """,
                    (pid, f"SKU-{pid}", pid, "Brand", "https://example.com", ts, ts, ts),
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
