"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useProductsCatalog } from "@/lib/catalog-client";
import { formatQAR } from "@/lib/format";
import { priceDelta } from "@/lib/watchlist";
import { useWatchlist } from "./WatchlistProvider";

export function WatchlistDropBanner() {
  const { items, ready } = useWatchlist();
  const { products } = useProductsCatalog();
  const [dismissed, setDismissed] = useState(false);

  const drops = useMemo(() => {
    const map = new Map(products.map((p) => [p.product_id, p]));
    return items
      .map((item) => ({
        item,
        current: map.get(item.product_id),
        delta: priceDelta(item.snapshot, map.get(item.product_id)),
      }))
      .filter(({ delta }) => delta.dropped);
  }, [items, products]);

  if (!ready || dismissed || drops.length === 0) return null;

  const totalSaved = drops.reduce((sum, { delta }) => sum + Math.abs(delta.amount), 0);

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">
            {drops.length} liked product{drops.length === 1 ? "" : "s"} dropped in price
          </p>
          <p className="mt-1 text-emerald-800">
            Combined savings up to {formatQAR(totalSaved)} vs when you liked them.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/my-list"
            className="inline-flex min-h-9 items-center rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800"
          >
            View My List
          </Link>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="inline-flex min-h-9 items-center rounded-lg px-3 py-1.5 text-xs text-emerald-800 hover:bg-emerald-100"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
