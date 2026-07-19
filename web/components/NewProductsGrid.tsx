"use client";

import { useState } from "react";
import type { Product } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { ProductCard } from "./ProductCard";

const PAGE_SIZE = 24;

interface NewProductsGridProps {
  products: Product[];
  windowHours: number;
  count48h: number;
}

export function NewProductsGrid({
  products,
  windowHours,
  count48h,
}: NewProductsGridProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const windowDays = Math.round(windowHours / 24);

  if (!products.length) {
    return (
      <p className="rounded-2xl border border-dashed border-black/20 bg-white p-8 text-center text-neutral-500">
        No newly listed products in the last {windowDays} days. Items appear here
        the first time they show up on the offer page.
      </p>
    );
  }

  const visible = products.slice(0, visibleCount);

  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
          Fresh arrivals
        </p>
        <h2 className="font-display text-xl sm:text-2xl">New on the offer</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Newly listed in the last {windowDays} days · {count48h.toLocaleString()} in
          the last 48h · showing {visible.length} of {products.length}
          {products.length >= 300 ? " (list capped at 300 most recent)" : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {visible.map((product, index) => (
          <div key={product.product_id} className="space-y-1">
            <ProductCard product={product} rank={index + 1} lazyImage />
            {product.first_seen_at && (
              <p className="px-1 text-[11px] text-neutral-500">
                Added {formatDate(product.first_seen_at)}
              </p>
            )}
          </div>
        ))}
      </div>

      {visibleCount < products.length && (
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
