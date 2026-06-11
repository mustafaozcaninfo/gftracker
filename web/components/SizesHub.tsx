"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { buildProductsHref } from "@/lib/product-filters";
import { SIZE_FILTER_MULTI, SIZE_FILTER_ONE } from "@/lib/sizes";

const POPULAR = [
  "One Size",
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "36",
  "37",
  "38",
  "39",
  "40",
  "41",
  "42",
];

export function SizesHub() {
  const [sizeCounts, setSizeCounts] = useState<Record<string, number>>({});
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/data/products.json")
      .then((res) => res.json())
      .then((data: { size_counts?: Record<string, number>; sizes?: string[] }) => {
        if (data.size_counts) {
          setSizeCounts(data.size_counts);
        } else if (data.sizes) {
          const counts: Record<string, number> = {};
          for (const size of data.sizes) counts[size] = 1;
          setSizeCounts(counts);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const entries = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.entries(sizeCounts)
      .filter(([size]) => !q || size.toLowerCase().includes(q))
      .sort((a, b) => b[1] - a[1]);
  }, [sizeCounts, query]);

  const popularEntries = useMemo(
    () =>
      POPULAR.map((size) => [size, sizeCounts[size] ?? 0] as const).filter(
        ([, count]) => count > 0,
      ),
    [sizeCounts],
  );

  if (loading) {
    return (
      <p className="rounded-2xl border border-black/10 bg-white p-8 text-center text-neutral-500">
        Loading sizes…
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Link
          href={buildProductsHref({ size: SIZE_FILTER_ONE })}
          className="rounded-full bg-white px-4 py-2 text-sm ring-1 ring-black/10 hover:bg-neutral-50"
        >
          One Size only
        </Link>
        <Link
          href={buildProductsHref({ size: SIZE_FILTER_MULTI })}
          className="rounded-full bg-white px-4 py-2 text-sm ring-1 ring-black/10 hover:bg-neutral-50"
        >
          Multiple sizes
        </Link>
      </div>

      {popularEntries.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-medium text-neutral-700">Popular sizes</h3>
          <div className="flex flex-wrap gap-2">
            {popularEntries.map(([size, count]) => (
              <Link
                key={size}
                href={buildProductsHref({ size })}
                className="rounded-full bg-gl-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
              >
                {size}
                <span className="ml-1.5 opacity-70">({count})</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search all sizes…"
        className="min-h-11 w-full max-w-md rounded-xl border border-black/10 px-3 py-2.5 text-sm outline-none ring-gl-gold focus:ring-2"
      />

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {entries.map(([size, count]) => (
          <Link
            key={size}
            href={buildProductsHref({ size })}
            className="flex items-center justify-between rounded-xl border border-black/10 bg-white px-4 py-3 text-sm transition hover:border-gl-gold"
          >
            <span className="font-medium">{size}</span>
            <span className="text-neutral-500">{count}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
