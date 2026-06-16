"""Catalog snapshot diff tests."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from models import ProductStore


def _insert_product(store: ProductStore, product_id: str, *, active: int = 1) -> None:
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
                "2026-06-12T10:00:00",
                "2026-06-12T10:00:00",
                active,
            ),
        )


class CatalogDiffTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.store = ProductStore(Path(self.tmp.name) / "test.db")

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def test_apply_catalog_diff_marks_removed(self) -> None:
        for pid in ("a", "b", "c"):
            _insert_product(self.store, pid)
        run_id = self.store.start_scrape_run(total_pages=1)

        diff = self.store.apply_catalog_diff(
            previous_ids={"a", "b", "c"},
            current_ids={"a", "b"},
            run_id=run_id,
            baseline="test",
        )

        self.assertEqual(diff["removed"], 1)
        self.assertEqual(diff["added"], 0)
        with self.store._connect() as conn:
            row = conn.execute(
                "SELECT is_active, removed_at FROM products WHERE product_id = ?",
                ("c",),
            ).fetchone()
            removal = conn.execute(
                "SELECT product_id FROM catalog_removals WHERE product_id = ?",
                ("c",),
            ).fetchone()
        self.assertEqual(int(row["is_active"]), 0)
        self.assertIsNotNone(row["removed_at"])
        self.assertIsNotNone(removal)

    def test_finalize_uses_previous_snapshot(self) -> None:
        for pid in ("1", "2"):
            _insert_product(self.store, pid)
        prev_run = self.store.start_scrape_run(total_pages=1)
        self.store.apply_catalog_diff(
            previous_ids={"1", "2"},
            current_ids={"1", "2"},
            run_id=prev_run,
            baseline="seed",
        )
        self.store.complete_scrape_run(prev_run, pages_scraped=1, products_found=2)

        current_run = self.store.start_scrape_run(total_pages=1)
        diff = self.store.finalize_scrape_catalog(["1"], run_id=current_run)

        self.assertEqual(diff["removed"], 1)
        self.assertEqual(diff["baseline"], f"snapshot:{prev_run}")

    def test_catalog_diff_records_additions_for_new_ids(self) -> None:
        for pid in ("keep", "newbie"):
            _insert_product(self.store, pid)
        run_id = self.store.start_scrape_run(total_pages=1)

        diff = self.store.apply_catalog_diff(
            previous_ids={"keep"},
            current_ids={"keep", "newbie"},
            run_id=run_id,
            baseline="snapshot:1",
        )

        self.assertEqual(diff["additions_recorded"], 1)
        with self.store._connect() as conn:
            row = conn.execute(
                "SELECT product_id FROM catalog_additions WHERE product_id = ?",
                ("newbie",),
            ).fetchone()
        self.assertIsNotNone(row)

        repeat = self.store.apply_catalog_diff(
            previous_ids={"keep"},
            current_ids={"keep", "newbie"},
            run_id=run_id,
            baseline="snapshot:2",
        )
        self.assertEqual(repeat["additions_recorded"], 0)


if __name__ == "__main__":
    unittest.main()
