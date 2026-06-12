"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { BrandStats } from "@/lib/types";
import { buildProductsHref } from "@/lib/product-filters";
import { formatQAR } from "@/lib/format";

export function BrandsGrid() {
  const [brands, setBrands] = useState<Record<string, BrandStats>>({});
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/data/brand_stats.json")
      .then((r) => r.json())
      .then((data: { brands: Record<string, BrandStats> }) => {
        setBrands(data.brands ?? {});
      })
      .finally(() => setLoading(false));
  }, []);

  const entries = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.entries(brands)
      .filter(([name]) => !q || name.toLowerCase().includes(q))
      .sort((a, b) => b[1].count - a[1].count);
  }, [brands, query]);

  if (loading) {
    return (
      <p className="rounded-2xl border border-black/10 bg-white p-8 text-center text-neutral-500">
        Loading brands…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <label htmlFor="brands-search" className="block max-w-md text-sm">
        <span className="sr-only">Search brands</span>
        <input
          id="brands-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search brands…"
          className="min-h-11 w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm outline-none ring-gl-gold focus:ring-2"
        />
      </label>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map(([name, stats]) => (
          <Link
            key={name}
            href={buildProductsHref({ brand: name })}
            className="rounded-2xl border border-black/10 bg-white p-4 transition hover:border-gl-gold hover:shadow-sm"
          >
            <p className="font-medium text-neutral-900">{name}</p>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-600">
              <span>{stats.count} products</span>
              <span>Avg {stats.avg_discount}% off</span>
              <span>Up to {stats.max_discount}%</span>
              {stats.min_price != null && (
                <span>From {formatQAR(stats.min_price)}</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
