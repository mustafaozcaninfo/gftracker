"""Tests for newly listed products detection (catalog diff, not DB insert)."""

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


def _insert_product_row(
    store: ProductStore,
    product_id: str,
    *,
    active: int = 1,
    first_seen_at: str | None = None,
) -> None:
    ts = first_seen_at or datetime.now(QATAR).isoformat(timespec="seconds")
    with store._connect() as conn:
        conn.execute(
            """
            INSERT INTO products (
                product_id, sku, name, brand, url, image_url, sizes_json,
                gender, first_seen_at, last_seen_at, is_active
            ) VALUES (?, ?, ?, ?, ?, '', '[]', 'women', ?, ?, ?)
            """,
            (
                product_id,
                f"SKU-{product_id}",
                f"Item {product_id}",
                "TestBrand",
                "https://example.com",
                ts,
                ts,
                active,
            ),
        )


def _insert_price(
    store: ProductStore,
    product_id: str,
    run_id: int,
    scraped_at: str | None = None,
) -> None:
    ts = scraped_at or datetime.now(QATAR).isoformat(timespec="seconds")
    with store._connect() as conn:
        conn.execute(
            """
            INSERT INTO daily_prices (
                product_id, scrape_run_id, price_date, current_price,
                old_price, discount_percent, page, scraped_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (product_id, run_id, store._today(), 120.0, 240.0, 50, 1, ts),
        )


class NewProductsTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.store = ProductStore(Path(self.tmp.name) / "test.db")

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def test_catalog_diff_records_new_listings(self) -> None:
        for pid in ("old", "fresh"):
            _insert_product_row(
                self.store,
                pid,
                first_seen_at=(datetime.now(QATAR) - timedelta(days=10)).isoformat(
                    timespec="seconds"
                ),
            )

        seed_run = self.store.start_scrape_run(total_pages=1)
        self.store.apply_catalog_diff(
            previous_ids={"old"},
            current_ids={"old"},
            run_id=seed_run,
            baseline="seed",
        )
        self.store.complete_scrape_run(seed_run, pages_scraped=1, products_found=1)
        _insert_price(self.store, "fresh", seed_run)

        current_run = self.store.start_scrape_run(total_pages=1)
        diff = self.store.apply_catalog_diff(
            previous_ids={"old"},
            current_ids={"old", "fresh"},
            run_id=current_run,
            baseline=f"snapshot:{seed_run}",
        )

        self.assertEqual(diff["added"], 1)
        self.assertEqual(diff["additions_recorded"], 1)

        new_items = self.store.get_new_products(recent_hours=48, limit=50)
        ids = {item["product_id"] for item in new_items}
        self.assertIn("fresh", ids)
        self.assertNotIn("old", ids)
        self.assertEqual(self.store.count_new_products(recent_hours=48), 1)

    def test_bootstrap_does_not_record_entire_catalog(self) -> None:
        for pid in ("a", "b", "c"):
            _insert_product_row(self.store, pid)

        run_id = self.store.start_scrape_run(total_pages=1)
        diff = self.store.apply_catalog_diff(
            previous_ids=set(),
            current_ids={"a", "b", "c"},
            run_id=run_id,
            baseline="active_db_bootstrap",
        )

        self.assertEqual(diff["added"], 3)
        self.assertEqual(diff["additions_recorded"], 0)
        self.assertEqual(self.store.count_new_products(recent_hours=48), 0)
        self.assertEqual(self.store.get_new_products(recent_hours=48), [])

    def test_count_excludes_inactive(self) -> None:
        recent_ts = datetime.now(QATAR).isoformat(timespec="seconds")
        _insert_product_row(self.store, "gone", active=0)
        _insert_product_row(self.store, "active", active=1)

        run_id = self.store.start_scrape_run(total_pages=1)
        with self.store._connect() as conn:
            conn.execute(
                """
                INSERT INTO catalog_additions (product_id, listed_at, scrape_run_id)
                VALUES (?, ?, ?), (?, ?, ?)
                """,
                ("gone", recent_ts, run_id, "active", recent_ts, run_id),
            )

        self.assertEqual(self.store.count_new_products(recent_hours=48), 1)

    def test_empty_previous_snapshot_does_not_record_additions(self) -> None:
        for pid in ("a", "b", "c"):
            _insert_product_row(self.store, pid)

        run_id = self.store.start_scrape_run(total_pages=1)
        diff = self.store.apply_catalog_diff(
            previous_ids=set(),
            current_ids={"a", "b", "c"},
            run_id=run_id,
            baseline="snapshot:99",
        )

        self.assertEqual(diff["added"], 3)
        self.assertEqual(diff["additions_recorded"], 0)
        self.assertEqual(self.store.count_new_products(recent_hours=48), 0)

    def test_bulk_additions_per_run_are_skipped(self) -> None:
        previous = {f"p{i}" for i in range(500)}
        current = previous | {f"new{i}" for i in range(201)}
        for pid in current:
            _insert_product_row(self.store, pid)

        run_id = self.store.start_scrape_run(total_pages=1)
        diff = self.store.apply_catalog_diff(
            previous_ids=previous,
            current_ids=current,
            run_id=run_id,
            baseline="snapshot:1",
        )

        self.assertEqual(diff["added"], 201)
        self.assertEqual(diff["additions_recorded"], 0)

    def test_first_db_insert_without_catalog_diff_is_not_new(self) -> None:
        run_id = self.store.start_scrape_run(total_pages=1)
        self.store.record_daily_scrape([_product("only-insert")], run_id)

        self.assertEqual(self.store.count_new_products(recent_hours=48), 0)
        self.assertEqual(self.store.get_new_products(recent_hours=48), [])


if __name__ == "__main__":
    unittest.main()
