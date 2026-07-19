"""Export tracker data for the Vercel web dashboard."""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any

import yaml

from models import ProductStore

SCRAPE_HISTORY_EXPORT_LIMIT = 48
SCRAPE_HISTORY_BACKUP_LIMIT = 96

NEW_PRODUCTS_LIST_HOURS = 168
NEW_PRODUCTS_BADGE_HOURS = 48
NEW_PRODUCTS_EXPORT_LIMIT = 300

SOLD_LIST_HOURS = 48
SOLD_BADGE_HOURS = 48
SOLD_EXPORT_LIMIT = 500

REQUIRED_EXPORT_FILES = (
    "meta.json",
    "products.json",
    "new_products.json",
    "sold_products.json",
    "price_changes.json",
    "best_deals.json",
    "biggest_drops.json",
    "brand_stats.json",
    "price_histories.json",
)

REQUIRED_META_STATS = (
    "total_products",
    "total_pages",
    "drops_today",
    "sold_total",
    "sold_recent_48h",
    "new_products_48h",
)


def _runs_to_index(runs: list[Any]) -> dict[int, dict[str, Any]]:
    return {
        int(run["id"]): run
        for run in runs
        if isinstance(run, dict) and run.get("id") is not None
    }


def load_scrape_history_backup(data_dir: Path) -> dict[int, dict[str, Any]]:
    path = data_dir / "scrape_history.json"
    if path.exists():
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
            return _runs_to_index(payload.get("runs", []))
        except (json.JSONDecodeError, TypeError, ValueError):
            pass

    # Cache miss: seed from last committed/deployed meta so history is not wiped.
    meta_path = data_dir.parent / "web/public/data/meta.json"
    if not meta_path.exists():
        return {}
    try:
        payload = json.loads(meta_path.read_text(encoding="utf-8"))
        return _runs_to_index(payload.get("scrape_history", []))
    except (json.JSONDecodeError, TypeError, ValueError):
        return {}


def merge_scrape_history(store: ProductStore, data_dir: Path) -> list[dict[str, Any]]:
    """Merge DB runs with cached backup so hourly CI does not lose history."""
    merged = load_scrape_history_backup(data_dir)
    for run in store.get_scrape_history(limit=SCRAPE_HISTORY_BACKUP_LIMIT):
        merged[int(run["id"])] = run
    runs = sorted(merged.values(), key=lambda row: int(row["id"]), reverse=True)[
        :SCRAPE_HISTORY_EXPORT_LIMIT
    ]
    data_dir.mkdir(parents=True, exist_ok=True)
    (data_dir / "scrape_history.json").write_text(
        json.dumps({"runs": runs}, ensure_ascii=False),
        encoding="utf-8",
    )
    return runs


def build_dashboard_payload(
    store: ProductStore,
    scrape_meta: dict[str, Any] | None = None,
    *,
    data_dir: Path | None = None,
) -> dict[str, Any]:
    products = store.get_products_with_analytics()
    price_changes = store.get_all_price_changes(limit=200)
    new_products = store.get_new_products(
        recent_hours=NEW_PRODUCTS_LIST_HOURS,
        limit=NEW_PRODUCTS_EXPORT_LIMIT,
    )
    new_products_48h = store.count_new_products(recent_hours=NEW_PRODUCTS_BADGE_HOURS)
    best_deals = store.get_today_best_deals(top_n=20)
    scrape_history = (
        merge_scrape_history(store, data_dir)
        if data_dir is not None
        else store.get_scrape_history(limit=SCRAPE_HISTORY_EXPORT_LIMIT)
    )

    brands = sorted({p["brand"] for p in products if p.get("brand")})
    discounts = [
        p["discount_percent"]
        for p in products
        if p.get("discount_percent") is not None
    ]

    discount_buckets: dict[str, int] = {}
    for start in range(0, 70, 10):
        label = f"{start}-{start + 9}"
        discount_buckets[label] = sum(
            1 for d in discounts if start <= d < start + 10
        )
    discount_buckets["70+"] = sum(1 for d in discounts if d >= 70)

    stats = {
        "total_products": len(products),
        "total_pages": (scrape_meta or {}).get("total_pages", 0),
        "pages_scraped": (scrape_meta or {}).get("pages_scraped", 0),
        "avg_discount": round(sum(discounts) / len(discounts), 1) if discounts else 0,
        "max_discount": max(discounts) if discounts else 0,
        "brand_count": len(brands),
        "price_changes_today": len(store.get_today_price_changes()),
        "drops_today": store.count_today_drops(),
        "new_products_48h": new_products_48h,
        "days_tracked": max((p.get("days_tracked") or 0 for p in products), default=0),
        "discount_buckets": discount_buckets,
        "high_discount_50_plus": sum(1 for d in discounts if d >= 50),
        "high_discount_60_plus": sum(1 for d in discounts if d >= 60),
        "best_deals_count": len(best_deals),
        "sold_recent_24h": store.count_sold_products(recent_hours=24),
        "sold_recent_48h": store.count_sold_products(recent_hours=48),
        "sold_total": store.count_sold_products(),
    }

    return {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "source": "Galeries Lafayette Qatar — offer.html",
        "stats": stats,
        "brands": brands,
        "products": products,
        "price_changes": price_changes,
        "new_products": new_products,
        "best_deals": best_deals,
        "scrape_history": scrape_history,
    }


def validate_export(out_dir: str | Path) -> None:
    """Ensure committed web JSON matches what the dashboard expects."""
    root = Path(out_dir)
    missing_files = [name for name in REQUIRED_EXPORT_FILES if not (root / name).exists()]
    if missing_files:
        raise ValueError(f"Export validation failed: missing files: {missing_files}")

    try:
        meta = json.loads((root / "meta.json").read_text(encoding="utf-8"))
        products_payload = json.loads((root / "products.json").read_text(encoding="utf-8"))
        new_payload = json.loads((root / "new_products.json").read_text(encoding="utf-8"))
        sold_payload = json.loads((root / "sold_products.json").read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as exc:
        raise ValueError(f"Export validation failed: unreadable JSON in {root}") from exc

    stats = meta.get("stats") or {}
    missing_stats = [key for key in REQUIRED_META_STATS if key not in stats]
    if missing_stats:
        raise ValueError(f"Export validation failed: meta.stats missing {missing_stats}")

    if "size_counts" not in products_payload:
        raise ValueError("Export validation failed: products.json missing size_counts")

    product_count = len(products_payload.get("products") or [])
    new_count = len(new_payload.get("new_products") or [])
    if new_count > product_count:
        raise ValueError(
            "Export validation failed: new_products count exceeds products "
            f"({new_count} > {product_count})"
        )

    if "sold_all" not in sold_payload or "sold_recent" not in sold_payload:
        raise ValueError("Export validation failed: sold_products.json missing sold lists")

    sold_recent_count = stats.get("sold_recent_48h", 0)
    sold_total_count = stats.get("sold_total", 0)
    sold_recent_len = len(sold_payload.get("sold_recent") or [])
    sold_all_len = len(sold_payload.get("sold_all") or [])
    if sold_recent_len < sold_recent_count:
        raise ValueError(
            "Export validation failed: sold_recent list shorter than sold_recent_48h "
            f"({sold_recent_len} < {sold_recent_count})"
        )
    if sold_all_len < sold_total_count:
        raise ValueError(
            "Export validation failed: sold_all list shorter than sold_total "
            f"({sold_all_len} < {sold_total_count})"
        )

    products = products_payload.get("products") or []
    if products:
        with_price = sum(1 for p in products if p.get("current_price") is not None)
        if with_price == 0:
            raise ValueError(
                "Export validation failed: no products have current_price "
                "(run scrape or restore data cache before deploy)"
            )


def export_dashboard(
    config_path: str | Path = "config.yaml",
    output_dir: str | Path = "web/public/data",
    scrape_meta: dict[str, Any] | None = None,
) -> Path:
    with Path(config_path).open(encoding="utf-8") as handle:
        config = yaml.safe_load(handle) or {}

    store = ProductStore(config["output"]["db_path"])
    data_dir = Path(config["output"]["db_path"]).parent
    payload = build_dashboard_payload(store, scrape_meta=scrape_meta, data_dir=data_dir)

    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    # Split files — each page loads only what it needs (no 5MB freeze)
    (out_dir / "meta.json").write_text(
        json.dumps(
            {
                "generated_at": payload["generated_at"],
                "source": payload["source"],
                "stats": payload["stats"],
                "brands": payload["brands"],
                "scrape_history": payload.get("scrape_history", []),
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    (out_dir / "best_deals.json").write_text(
        json.dumps({"best_deals": payload["best_deals"]}, ensure_ascii=False),
        encoding="utf-8",
    )
    (out_dir / "new_products.json").write_text(
        json.dumps(
            {
                "new_products": payload["new_products"],
                "window_hours": NEW_PRODUCTS_LIST_HOURS,
                "new_products_48h": payload["stats"]["new_products_48h"],
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    size_labels: set[str] = set()
    for product in payload["products"]:
        for size in product.get("sizes") or []:
            if size:
                size_labels.add(size)

    def _size_sort_key(label: str) -> tuple[int, str]:
        lower = label.lower()
        if lower == "one size" or lower.startswith("one size"):
            return (0, lower)
        return (1, lower)

    sizes_sorted = sorted(size_labels, key=_size_sort_key)

    size_counts: dict[str, int] = {}
    gender_counts: dict[str, int] = {}
    for product in payload["products"]:
        for size in product.get("sizes") or []:
            if size:
                size_counts[size] = size_counts.get(size, 0) + 1
        gender = product.get("gender") or ""
        if gender:
            gender_counts[gender] = gender_counts.get(gender, 0) + 1

    histories = store.export_price_histories(max_points=60)
    for product in payload["products"]:
        hist = histories.get(product["product_id"], [])
        product["sparkline"] = [point[1] for point in hist[-14:]]

    (out_dir / "products.json").write_text(
        json.dumps(
            {
                "products": payload["products"],
                "brands": payload["brands"],
                "sizes": sizes_sorted,
                "size_counts": size_counts,
                "genders": sorted(gender_counts.keys()),
                "gender_counts": gender_counts,
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    (out_dir / "price_changes.json").write_text(
        json.dumps({"price_changes": payload["price_changes"]}, ensure_ascii=False),
        encoding="utf-8",
    )

    biggest_drops = store.get_biggest_drops(limit=50)
    (out_dir / "biggest_drops.json").write_text(
        json.dumps({"biggest_drops": biggest_drops}, ensure_ascii=False),
        encoding="utf-8",
    )

    sold_recent_48h = store.count_sold_products(recent_hours=SOLD_BADGE_HOURS)
    sold_total = store.count_sold_products()
    sold_recent = store.get_sold_products(
        limit=max(sold_recent_48h, SOLD_EXPORT_LIMIT),
        recent_hours=SOLD_LIST_HOURS,
    )
    sold_all = store.get_sold_products(limit=max(sold_total, SOLD_EXPORT_LIMIT))
    (out_dir / "sold_products.json").write_text(
        json.dumps(
            {
                "sold_recent": sold_recent,
                "sold_all": sold_all,
                "window_hours": SOLD_LIST_HOURS,
                "sold_recent_24h": payload["stats"]["sold_recent_24h"],
                "sold_recent_48h": sold_recent_48h,
                "sold_total": sold_total,
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    brand_stats = store.get_brand_stats()
    (out_dir / "brand_stats.json").write_text(
        json.dumps({"brands": brand_stats}, ensure_ascii=False),
        encoding="utf-8",
    )

    (out_dir / "price_histories.json").write_text(
        json.dumps({"histories": histories}, ensure_ascii=False),
        encoding="utf-8",
    )

    validate_export(out_dir)
    return out_dir / "meta.json"


def scrape_meta_from_last_run(config_path: str | Path = "config.yaml") -> dict[str, Any] | None:
    """Seed export stats from the latest scrape run when not invoked after a live scrape."""
    with Path(config_path).open(encoding="utf-8") as handle:
        config = yaml.safe_load(handle) or {}
    runs = ProductStore(config["output"]["db_path"]).get_scrape_history(limit=1)
    if not runs:
        return None
    run = runs[0]
    total_pages = int(run.get("total_pages") or 0)
    pages_scraped = int(run.get("pages_scraped") or 0)
    pages_failed = max(0, total_pages - pages_scraped) if total_pages else 0
    return {
        "total_pages": total_pages,
        "pages_scraped": pages_scraped,
        "pages_failed": pages_failed,
        "scrape_complete": run.get("status") == "completed" and pages_failed == 0,
    }


if __name__ == "__main__":
    path = export_dashboard(scrape_meta=scrape_meta_from_last_run())
    print(f"Exported dashboard data to {path}")
