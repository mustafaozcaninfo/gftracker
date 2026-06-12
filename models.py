"""Data models and SQLite persistence for GFTracker v2.

Architecture
------------
products        Master catalog (one row per product_id)
scrape_runs     Each hourly session; completed runs store catalog_snapshot JSON
daily_prices    One price row per product per calendar day (UPSERT on same-day refresh)
price_changes   One row per product per Qatar calendar day; updated on each intraday move
                (old = previous price in the chain, new = latest seen that day)

Sold/gone: compare previous completed catalog_snapshot vs current full scrape;
only IDs in previous-but-not-current are marked inactive.
"""

from __future__ import annotations

import json
import sqlite3
from dataclasses import asdict, dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

from gender import infer_gender

QATAR_TZ = ZoneInfo("Asia/Qatar")


@dataclass
class Product:
    product_id: str
    sku: str
    name: str
    brand: str
    current_price: float
    old_price: float
    discount_percent: int
    url: str
    timestamp: str
    page: int
    image_url: str = ""
    sizes: list[str] = field(default_factory=list)
    gender: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class PriceChange:
    product_id: str
    sku: str
    name: str
    old_current_price: float
    new_current_price: float
    old_discount_percent: int
    new_discount_percent: int
    timestamp: str
    price_date: str = ""


@dataclass
class ScrapeStats:
    pages_scraped: int = 0
    pages_failed: int = 0
    products_found: int = 0
    price_changes: int = 0
    new_products: int = 0
    scrape_run_id: int = 0
    errors: list[str] = field(default_factory=list)


class ProductStore:
    SCHEMA_VERSION = 2

    def __init__(self, db_path: str | Path) -> None:
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute("PRAGMA journal_mode = WAL")
        conn.execute("PRAGMA synchronous = NORMAL")
        conn.execute("PRAGMA cache_size = -64000")
        conn.execute("PRAGMA temp_store = MEMORY")
        return conn

    def _init_db(self) -> None:
        with self._connect() as conn:
            self._migrate_v1_if_needed(conn)
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS meta (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS products (
                    product_id TEXT PRIMARY KEY,
                    sku TEXT NOT NULL,
                    name TEXT NOT NULL,
                    brand TEXT NOT NULL,
                    url TEXT NOT NULL,
                    first_seen_at TEXT NOT NULL,
                    last_seen_at TEXT NOT NULL,
                    is_active INTEGER NOT NULL DEFAULT 1
                );

                CREATE TABLE IF NOT EXISTS scrape_runs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    run_date TEXT NOT NULL,
                    started_at TEXT NOT NULL,
                    completed_at TEXT,
                    total_pages INTEGER DEFAULT 0,
                    pages_scraped INTEGER DEFAULT 0,
                    products_found INTEGER DEFAULT 0,
                    status TEXT NOT NULL DEFAULT 'running'
                );

                CREATE TABLE IF NOT EXISTS daily_prices (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_id TEXT NOT NULL,
                    scrape_run_id INTEGER,
                    price_date TEXT NOT NULL,
                    current_price REAL NOT NULL,
                    old_price REAL,
                    discount_percent INTEGER NOT NULL DEFAULT 0,
                    page INTEGER NOT NULL DEFAULT 0,
                    scraped_at TEXT NOT NULL,
                    UNIQUE(product_id, price_date),
                    FOREIGN KEY (product_id) REFERENCES products(product_id),
                    FOREIGN KEY (scrape_run_id) REFERENCES scrape_runs(id)
                );

                CREATE TABLE IF NOT EXISTS price_changes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    product_id TEXT NOT NULL,
                    sku TEXT NOT NULL,
                    name TEXT NOT NULL,
                    old_current_price REAL NOT NULL,
                    new_current_price REAL NOT NULL,
                    old_discount_percent INTEGER NOT NULL,
                    new_discount_percent INTEGER NOT NULL,
                    price_date TEXT NOT NULL,
                    timestamp TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_daily_prices_product
                    ON daily_prices(product_id);
                CREATE INDEX IF NOT EXISTS idx_daily_prices_date
                    ON daily_prices(price_date);
                CREATE INDEX IF NOT EXISTS idx_daily_prices_product_date
                    ON daily_prices(product_id, price_date);
                CREATE INDEX IF NOT EXISTS idx_price_changes_date
                    ON price_changes(price_date);
                CREATE UNIQUE INDEX IF NOT EXISTS idx_price_changes_product_date
                    ON price_changes(product_id, price_date);
                CREATE INDEX IF NOT EXISTS idx_scrape_runs_date
                    ON scrape_runs(run_date);
                """
            )
            conn.execute(
                "INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', ?)",
                (str(self.SCHEMA_VERSION),),
            )
            self._ensure_columns(conn)

    def _ensure_columns(self, conn: sqlite3.Connection) -> None:
        product_cols = {row[1] for row in conn.execute("PRAGMA table_info(products)")}
        if "image_url" not in product_cols:
            conn.execute("ALTER TABLE products ADD COLUMN image_url TEXT NOT NULL DEFAULT ''")
        if "sizes_json" not in product_cols:
            conn.execute(
                "ALTER TABLE products ADD COLUMN sizes_json TEXT NOT NULL DEFAULT '[]'"
            )
        if "gender" not in product_cols:
            conn.execute(
                "ALTER TABLE products ADD COLUMN gender TEXT NOT NULL DEFAULT ''"
            )
        if "removed_at" not in product_cols:
            conn.execute("ALTER TABLE products ADD COLUMN removed_at TEXT")

        run_cols = {row[1] for row in conn.execute("PRAGMA table_info(scrape_runs)")}
        if "catalog_snapshot" not in run_cols:
            conn.execute("ALTER TABLE scrape_runs ADD COLUMN catalog_snapshot TEXT")
        if "catalog_removed" not in run_cols:
            conn.execute(
                "ALTER TABLE scrape_runs ADD COLUMN catalog_removed INTEGER NOT NULL DEFAULT 0"
            )
        if "catalog_added" not in run_cols:
            conn.execute(
                "ALTER TABLE scrape_runs ADD COLUMN catalog_added INTEGER NOT NULL DEFAULT 0"
            )

    @staticmethod
    def _parse_sizes_json(raw: str | None) -> list[str]:
        if not raw:
            return []
        try:
            parsed = json.loads(raw)
            return [str(s) for s in parsed if s]
        except (json.JSONDecodeError, TypeError):
            return []

    @staticmethod
    def _sizes_payload(sizes: list[str]) -> str:
        return json.dumps(sizes, ensure_ascii=False)

    @staticmethod
    def _is_one_size(sizes: list[str]) -> bool:
        if len(sizes) != 1:
            return False
        label = sizes[0].strip().lower()
        return label in {
            "one size",
            "onesize",
            "os",
            "tu",
            "uni",
            "unique size",
        } or label.startswith("one size")

    def update_product_sizes(self, size_map: dict[str, list[str]]) -> int:
        if not size_map:
            return 0
        updated = 0
        with self._connect() as conn:
            for product_id, sizes in size_map.items():
                cursor = conn.execute(
                    "UPDATE products SET sizes_json = ? WHERE product_id = ?",
                    (self._sizes_payload(sizes), product_id),
                )
                updated += cursor.rowcount
        return updated

    def update_product_images(self, image_map: dict[str, str]) -> int:
        if not image_map:
            return 0
        updated = 0
        with self._connect() as conn:
            for product_id, image_url in image_map.items():
                if not image_url:
                    continue
                cursor = conn.execute(
                    "UPDATE products SET image_url = ? WHERE product_id = ?",
                    (image_url, product_id),
                )
                updated += cursor.rowcount
        return updated

    def _migrate_v1_if_needed(self, conn: sqlite3.Connection) -> None:
        cols = {row[1] for row in conn.execute("PRAGMA table_info(products)")}
        if not cols or "first_seen_at" in cols:
            return

        if "current_price" not in cols:
            return

        old_products = conn.execute("SELECT * FROM products").fetchall()
        history_exists = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='price_history'"
        ).fetchone()
        old_history = []
        if history_exists:
            old_history = conn.execute("SELECT * FROM price_history").fetchall()

        conn.executescript(
            """
            DROP TABLE IF EXISTS price_changes;
            DROP TABLE IF EXISTS price_history;
            DROP TABLE IF EXISTS products;
            DROP TABLE IF EXISTS daily_prices;
            DROP TABLE IF EXISTS scrape_runs;
            """
        )
        conn.executescript(
            """
            CREATE TABLE products (
                product_id TEXT PRIMARY KEY,
                sku TEXT NOT NULL,
                name TEXT NOT NULL,
                brand TEXT NOT NULL,
                url TEXT NOT NULL,
                first_seen_at TEXT NOT NULL,
                last_seen_at TEXT NOT NULL,
                is_active INTEGER NOT NULL DEFAULT 1
            );

            CREATE TABLE daily_prices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id TEXT NOT NULL,
                scrape_run_id INTEGER,
                price_date TEXT NOT NULL,
                current_price REAL NOT NULL,
                old_price REAL,
                discount_percent INTEGER NOT NULL DEFAULT 0,
                page INTEGER NOT NULL DEFAULT 0,
                scraped_at TEXT NOT NULL,
                UNIQUE(product_id, price_date)
            );
            """
        )

        for row in old_products:
            conn.execute(
                """
                INSERT INTO products (
                    product_id, sku, name, brand, url,
                    first_seen_at, last_seen_at, is_active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
                """,
                (
                    row["product_id"],
                    row["sku"],
                    row["name"],
                    row["brand"],
                    row["url"],
                    row["last_seen"],
                    row["last_seen"],
                ),
            )
            date_part = row["last_seen"][:10]
            conn.execute(
                """
                INSERT OR IGNORE INTO daily_prices (
                    product_id, price_date, current_price, old_price,
                    discount_percent, page, scraped_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    row["product_id"],
                    date_part,
                    row["current_price"],
                    row["old_price"],
                    row["discount_percent"],
                    row["last_page"],
                    row["last_seen"],
                ),
            )

        for row in old_history:
            date_part = row["timestamp"][:10]
            conn.execute(
                """
                INSERT OR REPLACE INTO daily_prices (
                    product_id, price_date, current_price, old_price,
                    discount_percent, page, scraped_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    row["product_id"],
                    date_part,
                    row["current_price"],
                    row["old_price"],
                    row["discount_percent"],
                    row["page"],
                    row["timestamp"],
                ),
            )

    @staticmethod
    def _today() -> str:
        return datetime.now(QATAR_TZ).strftime("%Y-%m-%d")

    @staticmethod
    def _yesterday() -> str:
        return (datetime.now(QATAR_TZ) - timedelta(days=1)).strftime("%Y-%m-%d")

    @staticmethod
    def _hours_ago_qatar(hours: int) -> str:
        """ISO timestamp cutoff for sold/recent filters (Asia/Qatar, not UTC)."""
        return (datetime.now(QATAR_TZ) - timedelta(hours=hours)).isoformat(timespec="seconds")

    def checkpoint_wal(self) -> None:
        """Flush WAL into the main DB file before CI cache upload."""
        with self._connect() as conn:
            conn.execute("PRAGMA wal_checkpoint(FULL)")

    def close_stale_scrape_runs(self, max_age_hours: int = 2) -> int:
        """Mark abandoned runs as failed (e.g. process killed mid-scrape)."""
        cutoff = (datetime.now() - timedelta(hours=max_age_hours)).isoformat(timespec="seconds")
        now = datetime.now().isoformat(timespec="seconds")
        with self._connect() as conn:
            cursor = conn.execute(
                """
                UPDATE scrape_runs
                SET status = 'failed', completed_at = ?
                WHERE status = 'running' AND started_at < ?
                """,
                (now, cutoff),
            )
            return cursor.rowcount

    def start_scrape_run(self, total_pages: int = 0) -> int:
        self.close_stale_scrape_runs()
        now = datetime.now().isoformat(timespec="seconds")
        with self._connect() as conn:
            cursor = conn.execute(
                """
                INSERT INTO scrape_runs (run_date, started_at, total_pages, status)
                VALUES (?, ?, ?, 'running')
                """,
                (self._today(), now, total_pages),
            )
            return int(cursor.lastrowid)

    def complete_scrape_run(
        self,
        run_id: int,
        *,
        pages_scraped: int,
        products_found: int,
        status: str = "completed",
    ) -> None:
        now = datetime.now().isoformat(timespec="seconds")
        with self._connect() as conn:
            conn.execute(
                """
                UPDATE scrape_runs
                SET completed_at = ?, pages_scraped = ?, products_found = ?,
                    status = ?, total_pages = COALESCE(total_pages, 0)
                WHERE id = ?
                """,
                (now, pages_scraped, products_found, status, run_id),
            )

    def update_scrape_run_progress(
        self,
        run_id: int,
        *,
        pages_scraped: int,
        products_found: int,
    ) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                UPDATE scrape_runs
                SET pages_scraped = ?, products_found = ?
                WHERE id = ?
                """,
                (pages_scraped, products_found, run_id),
            )

    def get_last_catalog_snapshot(self, before_run_id: int) -> tuple[int | None, set[str]]:
        """Product IDs from the most recent completed scrape with a saved snapshot."""
        with self._connect() as conn:
            row = conn.execute(
                """
                SELECT id, catalog_snapshot
                FROM scrape_runs
                WHERE id < ?
                  AND status = 'completed'
                  AND catalog_snapshot IS NOT NULL
                  AND catalog_snapshot != ''
                ORDER BY id DESC
                LIMIT 1
                """,
                (before_run_id,),
            ).fetchone()
        if not row:
            return None, set()
        try:
            ids = {str(pid) for pid in json.loads(row["catalog_snapshot"])}
        except (json.JSONDecodeError, TypeError):
            return int(row["id"]), set()
        return int(row["id"]), ids

    def get_active_catalog_ids(self) -> set[str]:
        """Active offer IDs currently stored (bootstrap when no snapshot exists yet)."""
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT product_id FROM products WHERE is_active = 1"
            ).fetchall()
        return {str(row["product_id"]) for row in rows}

    def apply_catalog_diff(
        self,
        *,
        previous_ids: set[str],
        current_ids: set[str],
        run_id: int,
        baseline: str,
    ) -> dict[str, int]:
        """Compare previous vs current full-catalog snapshots and mark sold/gone.

        Only products present in *previous* but missing from *current* are marked
        inactive. This is explicit run-to-run diffing, not a blind DB sweep.
        """
        removed_ids = previous_ids - current_ids
        added_ids = current_ids - previous_ids
        now = datetime.now().isoformat(timespec="seconds")

        with self._connect() as conn:
            if removed_ids:
                placeholders = ",".join("?" * len(removed_ids))
                conn.execute(
                    f"""
                    UPDATE products
                    SET is_active = 0, removed_at = ?
                    WHERE product_id IN ({placeholders})
                      AND is_active = 1
                    """,
                    [now, *removed_ids],
                )

            conn.execute(
                """
                UPDATE scrape_runs
                SET catalog_snapshot = ?,
                    catalog_removed = ?,
                    catalog_added = ?
                WHERE id = ?
                """,
                (
                    json.dumps(sorted(current_ids), ensure_ascii=False),
                    len(removed_ids),
                    len(added_ids),
                    run_id,
                ),
            )

        return {
            "baseline": baseline,
            "previous_size": len(previous_ids),
            "current_size": len(current_ids),
            "removed": len(removed_ids),
            "added": len(added_ids),
        }

    def finalize_scrape_catalog(
        self,
        current_ids: list[str],
        *,
        run_id: int,
    ) -> dict[str, int]:
        """Diff the latest complete scrape against the previous catalog snapshot."""
        current_set = {str(pid) for pid in current_ids if pid}
        if not current_set:
            return {
                "baseline": "none",
                "previous_size": 0,
                "current_size": 0,
                "removed": 0,
                "added": 0,
            }

        prev_run_id, previous_ids = self.get_last_catalog_snapshot(before_run_id=run_id)
        if previous_ids:
            baseline = f"snapshot:{prev_run_id}"
        else:
            previous_ids = self.get_active_catalog_ids()
            baseline = "active_db_bootstrap"

        return self.apply_catalog_diff(
            previous_ids=previous_ids,
            current_ids=current_set,
            run_id=run_id,
            baseline=baseline,
        )

    def record_daily_scrape(
        self,
        products: list[Product],
        scrape_run_id: int,
    ) -> tuple[list[PriceChange], ScrapeStats]:
        """Record products and prices for the current Qatar calendar day.

        Price changes are intraday: each hourly scrape may update the same
        product's row for today. ``daily_prices`` keeps the latest price;
        ``price_changes`` keeps one row per product per day (latest transition).
        """
        stats = ScrapeStats(products_found=len(products), scrape_run_id=scrape_run_id)
        changes: list[PriceChange] = []
        today = self._today()
        yesterday = self._yesterday()
        seen_ids: list[str] = []

        with self._connect() as conn:
            for product in products:
                seen_ids.append(product.product_id)

                existing = conn.execute(
                    "SELECT product_id FROM products WHERE product_id = ?",
                    (product.product_id,),
                ).fetchone()
                if existing is None:
                    stats.new_products += 1
                    conn.execute(
                        """
                        INSERT INTO products (
                            product_id, sku, name, brand, url, image_url, sizes_json,
                            gender, first_seen_at, last_seen_at, is_active
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
                        """,
                        (
                            product.product_id,
                            product.sku,
                            product.name,
                            product.brand,
                            product.url,
                            product.image_url,
                            self._sizes_payload(product.sizes),
                            product.gender or infer_gender(product.name, product.brand),
                            product.timestamp,
                            product.timestamp,
                        ),
                    )
                else:
                    conn.execute(
                        """
                        UPDATE products SET
                            sku = ?, name = ?, brand = ?, url = ?,
                            image_url = CASE
                                WHEN ? != '' THEN ?
                                ELSE image_url
                            END,
                            sizes_json = ?,
                            gender = ?,
                            last_seen_at = ?, is_active = 1, removed_at = NULL
                        WHERE product_id = ?
                        """,
                        (
                            product.sku,
                            product.name,
                            product.brand,
                            product.url,
                            product.image_url,
                            product.image_url,
                            self._sizes_payload(product.sizes),
                            product.gender or infer_gender(product.name, product.brand),
                            product.timestamp,
                            product.product_id,
                        ),
                    )

                prior_row = conn.execute(
                    """
                    SELECT current_price, discount_percent
                    FROM daily_prices
                    WHERE product_id = ? AND price_date = ?
                    """,
                    (product.product_id, today),
                ).fetchone()
                if prior_row is None:
                    prior_row = conn.execute(
                        """
                        SELECT current_price, discount_percent
                        FROM daily_prices
                        WHERE product_id = ? AND price_date = ?
                        """,
                        (product.product_id, yesterday),
                    ).fetchone()

                conn.execute(
                    """
                    INSERT INTO daily_prices (
                        product_id, scrape_run_id, price_date, current_price,
                        old_price, discount_percent, page, scraped_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(product_id, price_date) DO UPDATE SET
                        scrape_run_id = excluded.scrape_run_id,
                        current_price = excluded.current_price,
                        old_price = excluded.old_price,
                        discount_percent = excluded.discount_percent,
                        page = excluded.page,
                        scraped_at = excluded.scraped_at
                    """,
                    (
                        product.product_id,
                        scrape_run_id,
                        today,
                        product.current_price,
                        product.old_price,
                        product.discount_percent,
                        product.page,
                        product.timestamp,
                    ),
                )

                if prior_row:
                    old_price_val = float(prior_row["current_price"])
                    old_disc = int(prior_row["discount_percent"])
                    if (
                        old_price_val != product.current_price
                        or old_disc != product.discount_percent
                    ):
                        change = PriceChange(
                            product_id=product.product_id,
                            sku=product.sku,
                            name=product.name,
                            old_current_price=old_price_val,
                            new_current_price=product.current_price,
                            old_discount_percent=old_disc,
                            new_discount_percent=product.discount_percent,
                            timestamp=product.timestamp,
                            price_date=today,
                        )
                        changes.append(change)
                        stats.price_changes += 1
                        existing_change = conn.execute(
                            """
                            SELECT 1 FROM price_changes
                            WHERE product_id = ? AND price_date = ?
                            """,
                            (product.product_id, today),
                        ).fetchone()
                        if existing_change:
                            conn.execute(
                                """
                                UPDATE price_changes SET
                                    old_current_price = new_current_price,
                                    old_discount_percent = new_discount_percent,
                                    new_current_price = ?,
                                    new_discount_percent = ?,
                                    sku = ?,
                                    name = ?,
                                    timestamp = ?
                                WHERE product_id = ? AND price_date = ?
                                """,
                                (
                                    change.new_current_price,
                                    change.new_discount_percent,
                                    change.sku,
                                    change.name,
                                    change.timestamp,
                                    product.product_id,
                                    today,
                                ),
                            )
                        else:
                            conn.execute(
                                """
                                INSERT INTO price_changes (
                                    product_id, sku, name, old_current_price,
                                    new_current_price, old_discount_percent,
                                    new_discount_percent, price_date, timestamp
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                                """,
                                (
                                    change.product_id,
                                    change.sku,
                                    change.name,
                                    change.old_current_price,
                                    change.new_current_price,
                                    change.old_discount_percent,
                                    change.new_discount_percent,
                                    change.price_date,
                                    change.timestamp,
                                ),
                            )

        return changes, stats

    def get_lowest_prices(self) -> dict[str, dict[str, Any]]:
        """All-time lowest price per product (earliest date on tie)."""
        with self._connect() as conn:
            rows = conn.execute(
                """
                WITH ranked AS (
                    SELECT
                        product_id,
                        current_price AS lowest_price,
                        price_date AS lowest_date,
                        ROW_NUMBER() OVER (
                            PARTITION BY product_id
                            ORDER BY current_price ASC, price_date ASC
                        ) AS rn
                    FROM daily_prices
                )
                SELECT product_id, lowest_price, lowest_date
                FROM ranked WHERE rn = 1
                """
            ).fetchall()
        return {
            row["product_id"]: {
                "lowest_price": float(row["lowest_price"]),
                "lowest_date": row["lowest_date"],
            }
            for row in rows
        }

    def get_products_with_analytics(self) -> list[dict[str, Any]]:
        today = self._today()
        lows = self.get_lowest_prices()

        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT
                    p.product_id, p.sku, p.name, p.brand, p.url, p.image_url,
                    p.sizes_json, p.gender,
                    p.first_seen_at, p.last_seen_at, p.is_active,
                    dp.current_price, dp.old_price, dp.discount_percent,
                    dp.page, dp.scraped_at AS timestamp, dp.price_date,
                    (SELECT COUNT(DISTINCT price_date) FROM daily_prices d2
                     WHERE d2.product_id = p.product_id) AS days_tracked
                FROM products p
                LEFT JOIN daily_prices dp
                    ON dp.product_id = p.product_id AND dp.price_date = ?
                WHERE p.is_active = 1
                ORDER BY dp.discount_percent DESC, dp.current_price ASC
                """,
                (today,),
            ).fetchall()

        result: list[dict[str, Any]] = []
        for row in rows:
            item = dict(row)
            sizes = self._parse_sizes_json(item.pop("sizes_json", "[]"))
            item["sizes"] = sizes
            item["is_one_size"] = self._is_one_size(sizes)
            gender = (item.get("gender") or "").strip()
            if not gender:
                gender = infer_gender(item.get("name", ""), item.get("brand", ""))
            item["gender"] = gender
            low = lows.get(item["product_id"])
            current = item.get("current_price")

            if low and current is not None:
                item["lowest_price"] = low["lowest_price"]
                item["lowest_date"] = low["lowest_date"]
                item["is_at_lowest"] = float(current) <= low["lowest_price"]
                item["savings_vs_peak"] = round(float(current) - low["lowest_price"], 2)
                if low["lowest_price"] > 0:
                    item["pct_above_lowest"] = round(
                        ((float(current) - low["lowest_price"]) / low["lowest_price"]) * 100,
                        1,
                    )
                else:
                    item["pct_above_lowest"] = 0.0
            else:
                item["lowest_price"] = current
                item["lowest_date"] = today
                item["is_at_lowest"] = True
                item["savings_vs_peak"] = 0.0
                item["pct_above_lowest"] = 0.0

            result.append(item)

        return result

    def get_price_history(self, product_id: str) -> list[dict[str, Any]]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT price_date, current_price, old_price, discount_percent, scraped_at
                FROM daily_prices
                WHERE product_id = ?
                ORDER BY price_date ASC
                """,
                (product_id,),
            ).fetchall()
        return [dict(row) for row in rows]

    def _product_ids_with_price_variation(self) -> set[str]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT product_id FROM daily_prices
                GROUP BY product_id
                HAVING COUNT(DISTINCT current_price) > 1
                """
            ).fetchall()
        return {row["product_id"] for row in rows}

    def get_buy_signals(
        self,
        max_pct_above_lowest: float = 2.0,
        min_days_tracked: int = 2,
    ) -> list[dict[str, Any]]:
        """Products at or near their all-time low — good day to buy."""
        products = self.get_products_with_analytics()
        varied_ids = self._product_ids_with_price_variation()
        signals = [
            p
            for p in products
            if (p.get("days_tracked") or 0) >= min_days_tracked
            and p.get("product_id") in varied_ids
            and (
                p.get("is_at_lowest")
                or (p.get("pct_above_lowest", 100) <= max_pct_above_lowest)
            )
        ]
        signals.sort(
            key=lambda p: (
                p.get("pct_above_lowest") if p.get("pct_above_lowest") is not None else 999,
                -(p.get("discount_percent") or 0),
            )
        )
        return signals

    def save_daily_snapshot(self, products: list[Product], snapshot_dir: str | Path) -> Path:
        snapshot_path = Path(snapshot_dir)
        snapshot_path.mkdir(parents=True, exist_ok=True)
        date_str = self._today()
        file_path = snapshot_path / f"daily_snapshot_{date_str}.json"

        analytics = self.get_products_with_analytics()
        payload = {
            "date": date_str,
            "generated_at": datetime.now().isoformat(timespec="seconds"),
            "product_count": len(products),
            "products": [p.to_dict() for p in products],
            "analytics": analytics,
            "buy_signals": self.get_buy_signals(),
        }
        file_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
        return file_path

    def get_today_best_deals(self, top_n: int = 20) -> list[dict[str, Any]]:
        products = self.get_products_with_analytics()
        return sorted(
            products,
            key=lambda p: (-(p.get("discount_percent") or 0), p.get("current_price") or 0),
        )[:top_n]

    def get_today_price_changes(self) -> list[dict[str, Any]]:
        """Price moves for the current Qatar day (one row per product)."""
        today = self._today()
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT product_id, sku, name, old_current_price, new_current_price,
                       old_discount_percent, new_discount_percent, price_date, timestamp
                FROM price_changes
                WHERE price_date = ?
                ORDER BY timestamp DESC
                """,
                (today,),
            ).fetchall()
        return [dict(row) for row in rows]

    def get_today_drops(self) -> list[dict[str, Any]]:
        today = self._today()
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT product_id, sku, name, old_current_price, new_current_price,
                       old_discount_percent, new_discount_percent, price_date, timestamp
                FROM price_changes
                WHERE price_date = ?
                  AND new_current_price < old_current_price
                ORDER BY (old_current_price - new_current_price) DESC, timestamp DESC
                """,
                (today,),
            ).fetchall()
        return [dict(row) for row in rows]

    def count_today_drops(self) -> int:
        today = self._today()
        with self._connect() as conn:
            row = conn.execute(
                """
                SELECT COUNT(*) AS c
                FROM price_changes
                WHERE price_date = ?
                  AND new_current_price < old_current_price
                """,
                (today,),
            ).fetchone()
        return int(row["c"]) if row else 0

    def get_latest_products(self) -> list[dict[str, Any]]:
        return self.get_products_with_analytics()

    def get_all_price_changes(self, limit: int = 100) -> list[dict[str, Any]]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT product_id, sku, name, old_current_price, new_current_price,
                       old_discount_percent, new_discount_percent, price_date, timestamp
                FROM price_changes
                ORDER BY timestamp DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()
        return [dict(row) for row in rows]

    def get_biggest_drops(self, limit: int = 50) -> list[dict[str, Any]]:
        changes = self.get_all_price_changes(limit=500)
        drops: list[dict[str, Any]] = []
        for change in changes:
            old_p = float(change["old_current_price"])
            new_p = float(change["new_current_price"])
            if new_p >= old_p:
                continue
            amount = round(old_p - new_p, 2)
            item = dict(change)
            item["drop_amount"] = amount
            item["drop_percent"] = round((amount / old_p) * 100, 1) if old_p else 0
            drops.append(item)
        drops.sort(key=lambda row: row["drop_amount"], reverse=True)
        return drops[:limit]

    def get_sold_products(self, limit: int = 200, recent_hours: int | None = None) -> list[dict[str, Any]]:
        """Products no longer on the offer page (is_active=0) with last known price."""
        query = """
            SELECT
                p.product_id, p.sku, p.name, p.brand, p.url, p.image_url,
                p.sizes_json, p.gender, p.last_seen_at, p.removed_at,
                lp.current_price AS last_price,
                lp.old_price AS last_old_price,
                lp.discount_percent AS last_discount,
                lp.price_date AS last_price_date
            FROM products p
            LEFT JOIN (
                SELECT product_id, current_price, old_price, discount_percent, price_date,
                       ROW_NUMBER() OVER (
                           PARTITION BY product_id
                           ORDER BY price_date DESC, scraped_at DESC
                       ) AS rn
                FROM daily_prices
            ) lp ON lp.product_id = p.product_id AND lp.rn = 1
            WHERE p.is_active = 0
        """
        params: list[Any] = []
        if recent_hours is not None:
            query += " AND datetime(COALESCE(p.removed_at, p.last_seen_at)) >= datetime(?)"
            params.append(self._hours_ago_qatar(recent_hours))
        query += " ORDER BY COALESCE(p.removed_at, p.last_seen_at) DESC LIMIT ?"
        params.append(limit)

        with self._connect() as conn:
            rows = conn.execute(query, params).fetchall()

        result: list[dict[str, Any]] = []
        for row in rows:
            item = dict(row)
            sizes = self._parse_sizes_json(item.pop("sizes_json", "[]"))
            item["sizes"] = sizes
            item["is_one_size"] = self._is_one_size(sizes)
            gender = (item.get("gender") or "").strip()
            if not gender:
                gender = infer_gender(item.get("name", ""), item.get("brand", ""))
            item["gender"] = gender
            result.append(item)
        return result

    def count_sold_products(self, recent_hours: int | None = None) -> int:
        query = "SELECT COUNT(*) AS c FROM products WHERE is_active = 0"
        params: list[Any] = []
        if recent_hours is not None:
            query += " AND datetime(COALESCE(removed_at, last_seen_at)) >= datetime(?)"
            params.append(self._hours_ago_qatar(recent_hours))
        with self._connect() as conn:
            row = conn.execute(query, params).fetchone()
        return int(row["c"]) if row else 0

    def get_brand_stats(self) -> dict[str, dict[str, Any]]:
        products = self.get_products_with_analytics()
        stats: dict[str, dict[str, Any]] = {}
        for product in products:
            brand = product.get("brand") or ""
            if not brand:
                continue
            entry = stats.setdefault(
                brand,
                {"count": 0, "discounts": [], "max_discount": 0, "min_price": None},
            )
            entry["count"] += 1
            discount = int(product.get("discount_percent") or 0)
            entry["discounts"].append(discount)
            entry["max_discount"] = max(entry["max_discount"], discount)
            price = product.get("current_price")
            if price is not None:
                entry["min_price"] = (
                    price
                    if entry["min_price"] is None
                    else min(entry["min_price"], price)
                )
        for entry in stats.values():
            discounts = entry.pop("discounts")
            entry["avg_discount"] = (
                round(sum(discounts) / len(discounts), 1) if discounts else 0
            )
        return dict(sorted(stats.items(), key=lambda item: (-item[1]["count"], item[0])))

    def export_price_histories(self, max_points: int = 45) -> dict[str, list[list[Any]]]:
        """Compact histories: product_id -> [[date, price, discount], ...]."""
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT product_id, price_date, current_price, discount_percent
                FROM daily_prices
                ORDER BY product_id ASC, price_date ASC
                """
            ).fetchall()

        grouped: dict[str, list[list[Any]]] = {}
        for row in rows:
            pid = row["product_id"]
            point = [row["price_date"], float(row["current_price"]), int(row["discount_percent"])]
            grouped.setdefault(pid, []).append(point)

        for pid, points in grouped.items():
            if len(points) > max_points:
                grouped[pid] = points[-max_points:]
        return grouped

    def get_scrape_history(self, limit: int = 30) -> list[dict[str, Any]]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT id, run_date, started_at, completed_at, total_pages,
                       pages_scraped, products_found, status,
                       catalog_removed, catalog_added
                FROM scrape_runs
                ORDER BY id DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()
        return [dict(row) for row in rows]

