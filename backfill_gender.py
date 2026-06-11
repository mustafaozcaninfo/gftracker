#!/usr/bin/env python3
"""Backfill gender column from product names."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import yaml

from gender import infer_gender
from models import ProductStore


def main() -> int:
    with (ROOT / "config.yaml").open(encoding="utf-8") as handle:
        config = yaml.safe_load(handle) or {}

    store = ProductStore(config["output"]["db_path"])
    updated = 0
    with store._connect() as conn:
        rows = conn.execute("SELECT product_id, name, brand, gender FROM products").fetchall()
        for row in rows:
            gender = infer_gender(row["name"], row["brand"])
            if gender and gender != (row["gender"] or ""):
                conn.execute(
                    "UPDATE products SET gender = ? WHERE product_id = ?",
                    (gender, row["product_id"]),
                )
                updated += 1
    print(f"Updated gender for {updated} products")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
