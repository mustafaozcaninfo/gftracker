"""Data models and SQLite persistence for GFTracker v2.

Architecture
------------
products        Master catalog (one row per product_id)
scrape_runs     Each daily refresh session
daily_prices    One price row per product per calendar day (UPSERT on same-day refresh)
price_changes   Log when price moves between days
"""

from __future__ import annotations

import json
import sqlite3
from dataclasses import asdict, dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any


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
        return datetime.now().strftime("%Y-%m-%d")

    @staticmethod
    def _yesterday() -> str:
        return (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")

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

    def finalize_scrape_catalog(self, seen_product_ids: list[str]) -> None:
        """Mark products missing from the latest full scrape as inactive."""
        if not seen_product_ids:
            return
        with self._connect() as conn:
            placeholders = ",".join("?" * len(seen_product_ids))
            conn.execute(
                f"""
                UPDATE products SET is_active = 0
                WHERE product_id NOT IN ({placeholders})
                """,
                seen_product_ids,
            )

    def record_daily_scrape(
        self,
        products: list[Product],
        scrape_run_id: int,
        *,
        finalize: bool = False,
        all_seen_ids: list[str] | None = None,
    ) -> tuple[list[PriceChange], ScrapeStats]:
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
                            product_id, sku, name, brand, url, image_url,
                            first_seen_at, last_seen_at, is_active
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
                        """,
                        (
                            product.product_id,
                            product.sku,
                            product.name,
                            product.brand,
                            product.url,
                            product.image_url,
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
                            last_seen_at = ?, is_active = 1
                        WHERE product_id = ?
                        """,
                        (
                            product.sku,
                            product.name,
                            product.brand,
                            product.url,
                            product.image_url,
                            product.image_url,
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

            if finalize and all_seen_ids:
                self.finalize_scrape_catalog(all_seen_ids)

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

    def get_buy_signals(self, max_pct_above_lowest: float = 2.0) -> list[dict[str, Any]]:
        """Products at or near their all-time low — good day to buy."""
        products = self.get_products_with_analytics()
        return [
            p
            for p in products
            if p.get("is_at_lowest") or (p.get("pct_above_lowest", 100) <= max_pct_above_lowest)
        ]

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

    def get_scrape_history(self, limit: int = 30) -> list[dict[str, Any]]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT id, run_date, started_at, completed_at, total_pages,
                       pages_scraped, products_found, status
                FROM scrape_runs
                ORDER BY id DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()
        return [dict(row) for row in rows]

    # Backward-compatible alias used by main.py
    def upsert_products(self, products: list[Product]) -> tuple[list[PriceChange], ScrapeStats]:
        run_id = self.start_scrape_run()
        changes, stats = self.record_daily_scrape(products, run_id)
        self.complete_scrape_run(
            run_id,
            pages_scraped=stats.pages_scraped,
            products_found=stats.products_found,
        )
        return changes, stats
