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


def load_scrape_history_backup(data_dir: Path) -> dict[int, dict[str, Any]]:
    path = data_dir / "scrape_history.json"
    if not path.exists():
        return {}
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
        runs = payload.get("runs", [])
        return {
            int(run["id"]): run
            for run in runs
            if isinstance(run, dict) and run.get("id") is not None
        }
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
    buy_signals = store.get_buy_signals()
    scrape_history = (
        merge_scrape_history(store, data_dir)
        if data_dir is not None
        else store.get_scrape_history(limit=SCRAPE_HISTORY_EXPORT_LIMIT)
    )

    brands = sorted({p["brand"] for p in products if p.get("brand")})
    discounts = [p["discount_percent"] for p in products if p.get("discount_percent")]

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
        "buy_signals_count": len(buy_signals),
        "days_tracked": max((p.get("days_tracked") or 0 for p in products), default=0),
        "discount_buckets": discount_buckets,
        "high_discount_50_plus": sum(1 for d in discounts if d >= 50),
        "high_discount_60_plus": sum(1 for d in discounts if d >= 60),
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
        "buy_signals": buy_signals,
        "best_deals": store.get_today_best_deals(top_n=20),
        "scrape_history": scrape_history,
    }


def export_dashboard(
    config_path: str | Path = "config.yaml",
    output_path: str | Path = "web/public/data/dashboard.json",
    scrape_meta: dict[str, Any] | None = None,
) -> Path:
    with Path(config_path).open(encoding="utf-8") as handle:
        config = yaml.safe_load(handle) or {}

    store = ProductStore(config["output"]["db_path"])
    data_dir = Path(config["output"]["db_path"]).parent
    payload = build_dashboard_payload(store, scrape_meta=scrape_meta, data_dir=data_dir)

    out_dir = Path(output_path).parent
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
    (out_dir / "buy_signals.json").write_text(
        json.dumps({"buy_signals": payload["buy_signals"]}, ensure_ascii=False),
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

    histories = store.export_price_histories(max_points=14)
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

    sold_recent = store.get_sold_products(limit=100, recent_hours=48)
    sold_all = store.get_sold_products(limit=200)
    (out_dir / "sold_products.json").write_text(
        json.dumps(
            {
                "sold_recent": sold_recent,
                "sold_all": sold_all,
                "sold_recent_24h": payload["stats"]["sold_recent_24h"],
                "sold_recent_48h": payload["stats"]["sold_recent_48h"],
                "sold_total": payload["stats"]["sold_total"],
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

    out = Path(output_path)
    out.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    return out


if __name__ == "__main__":
    path = export_dashboard()
    print(f"Exported dashboard data to {path}")
