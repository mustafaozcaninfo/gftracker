"use client";

import { useState } from "react";
import type { Product } from "@/lib/types";
import { ProductCard } from "./ProductCard";

const PAGE_SIZE = 24;

export function BuySignalsGrid({ signals }: { signals: Product[] }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  if (!signals.length) {
    return (
      <p className="rounded-2xl border border-dashed border-black/20 bg-white p-8 text-center text-neutral-500">
        No buy signals yet. Need 2+ days of history and at least one prior
        higher price before near-low alerts are shown.
      </p>
    );
  }

  const visible = signals.slice(0, visibleCount);

  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
          Timing
        </p>
        <h2 className="font-display text-xl sm:text-2xl">
          Buy Signals — At or Near All-Time Low
        </h2>
        <p className="mt-1 text-xs text-neutral-500 sm:text-sm">
          Showing {visible.length} of {signals.length} · within 2% of lowest tracked
          price (min. 2 days history).
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {visible.map((product, index) => (
          <ProductCard
            key={product.product_id}
            product={product}
            rank={index + 1}
            lazyImage
          />
        ))}
      </div>

      {visibleCount < signals.length && (
        <div className="flex justify-center pt-4">
          <button
            type="button"
            onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
            className="min-h-11 w-full rounded-xl bg-gl-black px-6 py-3 text-sm font-medium text-white hover:bg-neutral-800 sm:w-auto"
          >
            Load more
          </button>
        </div>
      )}
    </section>
  );
}
