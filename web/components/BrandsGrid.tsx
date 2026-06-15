"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { BrandStats } from "@/lib/types";
import {
  type BrandSortKey,
  BRAND_SORT_LABELS,
  buildBrandsHref,
  parseBrandSort,
} from "@/lib/brand-filters";
import { buildProductsHref } from "@/lib/product-filters";
import { formatQAR } from "@/lib/format";

function sortBrands(
  entries: [string, BrandStats][],
  sort: BrandSortKey,
): [string, BrandStats][] {
  return [...entries].sort((a, b) => {
    const [nameA, statsA] = a;
    const [nameB, statsB] = b;
    switch (sort) {
      case "name_asc":
        return nameA.localeCompare(nameB);
      case "name_desc":
        return nameB.localeCompare(nameA);
      case "avg_disc":
        return statsB.avg_discount - statsA.avg_discount || nameA.localeCompare(nameB);
      case "max_disc":
        return statsB.max_discount - statsA.max_discount || nameA.localeCompare(nameB);
      case "price_asc":
        return (
          (statsA.min_price ?? Number.POSITIVE_INFINITY) -
            (statsB.min_price ?? Number.POSITIVE_INFINITY) ||
          nameA.localeCompare(nameB)
        );
      default:
        return statsB.count - statsA.count || nameA.localeCompare(nameB);
    }
  });
}

export function BrandsGrid() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [brands, setBrands] = useState<Record<string, BrandStats>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sort = parseBrandSort(searchParams.get("sort"));
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  useEffect(() => {
    fetch("/data/brand_stats.json")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load brand stats");
        return r.json();
      })
      .then((data: { brands: Record<string, BrandStats> }) => {
        setBrands(data.brands ?? {});
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  const updateUrl = useCallback(
    (patch: { search?: string; sort?: BrandSortKey }) => {
      const nextSearch = patch.search ?? query;
      const nextSort = patch.sort ?? sort;
      router.replace(
        buildBrandsHref({ search: nextSearch, sort: nextSort }),
        { scroll: false },
      );
    },
    [query, sort, router],
  );

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const urlQ = searchParams.get("q") ?? "";
      if (query.trim() === urlQ.trim()) return;
      updateUrl({ search: query });
    }, 300);
    return () => window.clearTimeout(handle);
  }, [query, searchParams, updateUrl]);

  const entries = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = Object.entries(brands).filter(
      ([name]) => !q || name.toLowerCase().includes(q),
    );
    return sortBrands(filtered, sort);
  }, [brands, query, sort]);

  if (loading) {
    return (
      <p className="rounded-2xl border border-black/10 bg-white p-8 text-center text-neutral-500">
        Loading brands…
      </p>
    );
  }

  if (error) {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
        {error}
      </p>
    );
  }

  if (Object.keys(brands).length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-black/20 bg-white p-8 text-center text-neutral-500">
        No brand data available yet. Check back after the next scrape.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-black/8 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label htmlFor="brands-search" className="min-w-0 flex-1 text-sm">
            <span className="mb-1.5 block text-neutral-500">Search</span>
            <input
              id="brands-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by brand name…"
              className="min-h-11 w-full rounded-xl border border-black/10 bg-gl-cream/50 px-3 py-2.5 text-sm outline-none ring-gl-gold focus:bg-white focus:ring-2"
            />
          </label>

          <label htmlFor="brands-sort" className="w-full text-sm sm:w-56">
            <span className="mb-1.5 block text-neutral-500">Sort by</span>
            <select
              id="brands-sort"
              value={sort}
              onChange={(e) =>
                updateUrl({ sort: e.target.value as BrandSortKey })
              }
              className="min-h-11 w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm outline-none ring-gl-gold focus:ring-2"
            >
              {(Object.keys(BRAND_SORT_LABELS) as BrandSortKey[]).map((key) => (
                <option key={key} value={key}>
                  {BRAND_SORT_LABELS[key]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="mt-3 text-xs text-neutral-500 sm:text-sm">
          {entries.length.toLocaleString()} brand
          {entries.length === 1 ? "" : "s"}
          {query.trim() ? ` matching “${query.trim()}”` : ""}
        </p>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/20 bg-white p-8 text-center">
          <p className="text-neutral-600">No brands match your search.</p>
          <Link
            href="/brands"
            className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-gl-black px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Clear search
          </Link>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map(([name, stats]) => (
            <Link
              key={name}
              href={buildProductsHref({ brand: name })}
              className="rounded-2xl border border-black/8 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-gl-gold/50 hover:shadow-md"
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
      )}
    </div>
  );
}
