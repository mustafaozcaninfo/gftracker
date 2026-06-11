"""Export tracker data for the Vercel web dashboard."""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any

import yaml

from models import ProductStore


def build_dashboard_payload(
    store: ProductStore,
    scrape_meta: dict[str, Any] | None = None,
) -> dict[str, Any]:
    products = store.get_products_with_analytics()
    price_changes = store.get_all_price_changes(limit=200)
    buy_signals = store.get_buy_signals()
    scrape_history = store.get_scrape_history(limit=14)

    brands = sorted({p["brand"] for p in products if p.get("brand")})
    discounts = [p["discount_percent"] for p in products if p.get("discount_percent")]

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
    payload = build_dashboard_payload(store, scrape_meta=scrape_meta)

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
    (out_dir / "products.json").write_text(
        json.dumps(
            {"products": payload["products"], "brands": payload["brands"]},
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    (out_dir / "price_changes.json").write_text(
        json.dumps({"price_changes": payload["price_changes"]}, ensure_ascii=False),
        encoding="utf-8",
    )

    out = Path(output_path)
    out.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    return out


if __name__ == "__main__":
    path = export_dashboard()
    print(f"Exported dashboard data to {path}")
