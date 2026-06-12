"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { FilterFacets } from "@/lib/catalog-filters";
import {
  type ProductFilters,
  type SortKey,
  buildProductsHref,
} from "@/lib/product-filters";
import {
  SIZE_FILTER_MULTI,
  SIZE_FILTER_ONE,
} from "@/lib/sizes";
import { ActiveFilterChips } from "./ActiveFilterChips";

const QUICK_PRESETS = [
  { label: "30%+ off", mindisc: 30 },
  { label: "50%+ off", mindisc: 50 },
  { label: "Under 500", maxprice: 500 },
  { label: "Under 1,000", maxprice: 1000 },
] as const;

interface CatalogFiltersProps {
  filters: ProductFilters;
  searchQuery: string;
  query: string;
  maxPriceInput: string;
  minDiscount: number;
  facets: FilterFacets;
  totalProducts: number;
  resultCount: number;
  onQueryChange: (value: string) => void;
  onMaxPriceChange: (value: string) => void;
  onUpdate: (patch: Partial<ProductFilters>) => void;
}

function countActive(filters: ProductFilters, search: string): number {
  let n = 0;
  if (search.trim()) n++;
  if (filters.brand !== "all") n++;
  if (filters.gender !== "all") n++;
  if (filters.size !== "all") n++;
  if (filters.maxprice > 0) n++;
  if (filters.mindisc > 0) n++;
  if (filters.sort !== "discount") n++;
  return n;
}

export function CatalogFilters({
  filters,
  searchQuery,
  query,
  maxPriceInput,
  minDiscount,
  facets,
  totalProducts,
  resultCount,
  onQueryChange,
  onMaxPriceChange,
  onUpdate,
}: CatalogFiltersProps) {
  const [open, setOpen] = useState(false);
  const activeCount = useMemo(
    () => countActive(filters, searchQuery),
    [filters, searchQuery],
  );

  const brandOptions =
    filters.brand !== "all" && !facets.brands.includes(filters.brand)
      ? [filters.brand, ...facets.brands]
      : facets.brands;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-black/8 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
              Catalog
            </p>
            <h2 className="font-display text-xl sm:text-2xl">All Products</h2>
            <p className="text-xs text-neutral-500 sm:text-sm">
              {resultCount.toLocaleString()} matching
              {resultCount !== totalProducts &&
                ` · ${totalProducts.toLocaleString()} total`}
            </p>
          </div>

          <label htmlFor="catalog-search" className="w-full sm:max-w-sm">
            <span className="sr-only">Search products</span>
            <input
              id="catalog-search"
              type="search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Brand, name, SKU…"
              className="min-h-11 w-full rounded-xl border border-black/10 bg-gl-cream/50 px-3 py-2.5 text-base outline-none ring-gl-gold focus:bg-white focus:ring-2 sm:text-sm"
            />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="mr-1 self-center text-[10px] font-medium uppercase tracking-wide text-neutral-400">
            Quick
          </span>
          {QUICK_PRESETS.map((preset) => (
            <Link
              key={preset.label}
              href={buildProductsHref({ ...filters, ...preset })}
              className="rounded-full bg-gl-cream px-3 py-1.5 text-xs font-medium text-neutral-700 transition hover:bg-neutral-200/70"
            >
              {preset.label}
            </Link>
          ))}
        </div>

        <button
          type="button"
          className="mt-4 flex w-full min-h-11 items-center justify-between rounded-xl border border-black/10 bg-gl-cream/60 px-4 py-2.5 text-sm font-medium sm:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <span>Filters{activeCount > 0 ? ` (${activeCount})` : ""}</span>
          <span className="text-neutral-500">{open ? "▲" : "▼"}</span>
        </button>

        <div
          className={`mt-4 space-y-4 border-t border-black/6 pt-4 ${open ? "block" : "hidden sm:block"}`}
        >
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
              Refine
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label htmlFor="catalog-brand" className="space-y-1.5 text-sm">
                <span className="text-neutral-500">Brand</span>
                <select
                  id="catalog-brand"
                  value={filters.brand}
                  onChange={(e) =>
                    onUpdate({ brand: e.target.value, size: "all" })
                  }
                  className="min-h-11 w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm outline-none ring-gl-gold focus:ring-2"
                >
                  <option value="all">All brands</option>
                  {brandOptions.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </label>

              {facets.genders.length > 0 && (
                <label htmlFor="catalog-gender" className="space-y-1.5 text-sm">
                  <span className="text-neutral-500">Gender</span>
                  <select
                    id="catalog-gender"
                    value={filters.gender}
                    onChange={(e) =>
                      onUpdate({
                        gender: e.target.value as ProductFilters["gender"],
                        size: "all",
                      })
                    }
                    className="min-h-11 w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm outline-none ring-gl-gold focus:ring-2"
                  >
                    <option value="all">All</option>
                    {facets.genders.map((g) => (
                      <option key={g} value={g}>
                        {g.charAt(0).toUpperCase() + g.slice(1)}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label htmlFor="catalog-size" className="space-y-1.5 text-sm">
                <span className="text-neutral-500">
                  Size
                  {facets.sizes.length > 0 && (
                    <span className="ml-1 text-neutral-400">
                      ({facets.sizes.length})
                    </span>
                  )}
                </span>
                <select
                  id="catalog-size"
                  value={filters.size}
                  onChange={(e) => onUpdate({ size: e.target.value })}
                  className="min-h-11 w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm outline-none ring-gl-gold focus:ring-2"
                >
                  <option value="all">All sizes</option>
                  {facets.hasOneSize && (
                    <option value={SIZE_FILTER_ONE}>One Size</option>
                  )}
                  {facets.hasMultiSize && (
                    <option value={SIZE_FILTER_MULTI}>Multiple sizes</option>
                  )}
                  {facets.sizes.length > 0 && (
                    <optgroup label="Specific size">
                      {facets.sizes.map((label) => (
                        <option key={label} value={label}>
                          {label}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </label>
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
              Price & sort
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label htmlFor="catalog-maxprice" className="space-y-1.5 text-sm">
                <span className="text-neutral-500">Max price (QAR)</span>
                <input
                  id="catalog-maxprice"
                  type="number"
                  min={0}
                  step={50}
                  value={maxPriceInput}
                  onChange={(e) => onMaxPriceChange(e.target.value)}
                  placeholder="Any"
                  className="min-h-11 w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm outline-none ring-gl-gold focus:ring-2"
                />
              </label>

              <label htmlFor="catalog-mindisc" className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-neutral-500">Min discount</span>
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium tabular-nums">
                    {minDiscount}%
                  </span>
                </div>
                <input
                  id="catalog-mindisc"
                  type="range"
                  min={0}
                  max={70}
                  step={5}
                  value={minDiscount}
                  onChange={(e) =>
                    onUpdate({ mindisc: Number(e.target.value) })
                  }
                  className="w-full"
                  aria-valuemin={0}
                  aria-valuemax={70}
                  aria-valuenow={minDiscount}
                />
              </label>

              <label htmlFor="catalog-sort" className="space-y-1.5 text-sm">
                <span className="text-neutral-500">Sort by</span>
                <select
                  id="catalog-sort"
                  value={filters.sort}
                  onChange={(e) =>
                    onUpdate({ sort: e.target.value as SortKey })
                  }
                  className="min-h-11 w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm outline-none ring-gl-gold focus:ring-2"
                >
                  <option value="discount">Highest discount</option>
                  <option value="price_asc">Price: low to high</option>
                  <option value="price_desc">Price: high to low</option>
                  <option value="name">Name A–Z</option>
                </select>
              </label>
            </div>
          </div>
        </div>
      </div>

      <ActiveFilterChips filters={filters} searchQuery={searchQuery} />
    </div>
  );
}
