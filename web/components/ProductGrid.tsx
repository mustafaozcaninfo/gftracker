"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Product } from "@/lib/types";
import {
  deriveFilterFacets,
  isBrandAvailable,
  isGenderAvailable,
  isSizeAvailable,
  productMatchesFilters,
} from "@/lib/catalog-filters";
import {
  type SortKey,
  buildProductsHref,
  parseProductFilters,
} from "@/lib/product-filters";
import {
  SIZE_FILTER_MULTI,
  SIZE_FILTER_ONE,
} from "@/lib/sizes";
import { ActiveFilterChips } from "./ActiveFilterChips";
import { ProductCard } from "./ProductCard";

const PAGE_SIZE = 24;

interface ProductGridProps {
  brands: string[];
}

export function ProductGrid({ brands: _brands }: ProductGridProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filters = useMemo(
    () => parseProductFilters(searchParams),
    [searchParams],
  );
  const { brand, size, gender, maxprice, mindisc: minDiscount, sort } = filters;

  const [query, setQuery] = useState(filters.search);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    setQuery(filters.search);
  }, [filters.search]);

  const updateFilters = useCallback(
    (patch: Partial<{
      search: string;
      brand: string;
      size: string;
      gender: typeof filters.gender;
      maxprice: number;
      mindisc: number;
      sort: SortKey;
    }>) => {
      const next = {
        search: patch.search ?? filters.search,
        brand: patch.brand ?? filters.brand,
        size: patch.size ?? filters.size,
        gender: patch.gender ?? filters.gender,
        maxprice: patch.maxprice ?? filters.maxprice,
        mindisc: patch.mindisc ?? filters.mindisc,
        sort: patch.sort ?? filters.sort,
      };
      router.replace(buildProductsHref(next), { scroll: false });
    },
    [filters, router],
  );

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (query.trim() === filters.search.trim()) return;
      updateFilters({ search: query });
    }, 300);
    return () => window.clearTimeout(handle);
  }, [query, filters.search, updateFilters]);

  useEffect(() => {
    let cancelled = false;
    fetch("/data/products.json")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load products");
        return res.json();
      })
      .then((data: { products: Product[] }) => {
        if (!cancelled) setProducts(data.products);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const facets = useMemo(
    () => deriveFilterFacets(products, filters, deferredQuery),
    [products, filters, deferredQuery],
  );

  useEffect(() => {
    const patches: Partial<typeof filters> = {};
    if (!isBrandAvailable(brand, facets)) patches.brand = "all";
    if (!isGenderAvailable(gender, facets)) patches.gender = "all";
    if (!isSizeAvailable(size, facets)) patches.size = "all";
    if (Object.keys(patches).length > 0) updateFilters(patches);
  }, [facets, brand, gender, size, updateFilters]);

  const filtered = useMemo(() => {
    const list = products.filter((p) =>
      productMatchesFilters(p, filters, deferredQuery),
    );

    return list.sort((a, b) => {
      switch (sort) {
        case "price_asc":
          return (a.current_price ?? 0) - (b.current_price ?? 0);
        case "price_desc":
          return (b.current_price ?? 0) - (a.current_price ?? 0);
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return (
            (b.discount_percent ?? 0) - (a.discount_percent ?? 0) ||
            (a.current_price ?? 0) - (b.current_price ?? 0)
          );
      }
    });
  }, [products, deferredQuery, filters, sort]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [deferredQuery, brand, size, gender, maxprice, minDiscount, sort]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  if (loading) {
    return (
      <p className="rounded-2xl border border-black/10 bg-white p-12 text-center text-neutral-500">
        Loading catalog…
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

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
            Catalog
          </p>
          <h2 className="font-display text-xl sm:text-2xl">All Products</h2>
        </div>
        <p className="text-xs text-neutral-500 sm:text-sm">
          Showing {visible.length.toLocaleString()} of{" "}
          {filtered.length.toLocaleString()}
          {filtered.length !== products.length &&
            ` (${products.length.toLocaleString()} total)`}
        </p>
      </div>

      <ActiveFilterChips filters={filters} searchQuery={deferredQuery} />

      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-black/10 bg-white p-3 sm:gap-3 sm:p-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="space-y-1.5 text-sm">
          <span className="text-neutral-500">Search</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Brand, name, SKU..."
            className="min-h-11 w-full rounded-xl border border-black/10 px-3 py-2.5 text-base outline-none ring-gl-gold focus:ring-2 sm:text-sm"
          />
        </label>

        <label className="space-y-1.5 text-sm">
          <span className="text-neutral-500">
            Brand
            {facets.brands.length > 0 && facets.brands.length < products.length && (
              <span className="ml-1 text-neutral-400">({facets.brands.length})</span>
            )}
          </span>
          <select
            value={brand}
            onChange={(e) => updateFilters({ brand: e.target.value, size: "all" })}
            className="min-h-11 w-full rounded-xl border border-black/10 px-3 py-2.5 text-base outline-none ring-gl-gold focus:ring-2 sm:text-sm"
          >
            <option value="all">All brands</option>
            {facets.brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>

        {facets.genders.length > 0 && (
          <label className="space-y-1.5 text-sm">
            <span className="text-neutral-500">
              Gender
              {facets.genders.length < 4 && (
                <span className="ml-1 text-neutral-400">({facets.genders.length})</span>
              )}
            </span>
            <select
              value={gender}
              onChange={(e) =>
                updateFilters({
                  gender: e.target.value as typeof filters.gender,
                  size: "all",
                })
              }
              className="min-h-11 w-full rounded-xl border border-black/10 px-3 py-2.5 text-base outline-none ring-gl-gold focus:ring-2 sm:text-sm"
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

        <label className="space-y-1.5 text-sm">
          <span className="text-neutral-500">
            Size
            {facets.sizes.length > 0 && (
              <span className="ml-1 text-neutral-400">({facets.sizes.length})</span>
            )}
          </span>
          <select
            value={size}
            onChange={(e) => updateFilters({ size: e.target.value })}
            className="min-h-11 w-full rounded-xl border border-black/10 px-3 py-2.5 text-base outline-none ring-gl-gold focus:ring-2 sm:text-sm"
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

        <label className="space-y-1.5 text-sm">
          <span className="text-neutral-500">Max price (QAR)</span>
          <input
            type="number"
            min={0}
            step={50}
            value={maxprice || ""}
            onChange={(e) =>
              updateFilters({ maxprice: Number(e.target.value) || 0 })
            }
            placeholder="Any"
            className="min-h-11 w-full rounded-xl border border-black/10 px-3 py-2.5 text-base outline-none ring-gl-gold focus:ring-2 sm:text-sm"
          />
        </label>

        <label className="space-y-2 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-neutral-500">Min discount</span>
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium tabular-nums">
              {minDiscount}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={70}
            step={5}
            value={minDiscount}
            onChange={(e) =>
              updateFilters({ mindisc: Number(e.target.value) })
            }
            className="mt-1 w-full"
            aria-valuemin={0}
            aria-valuemax={70}
            aria-valuenow={minDiscount}
          />
        </label>

        <label className="space-y-1.5 text-sm">
          <span className="text-neutral-500">Sort by</span>
          <select
            value={sort}
            onChange={(e) =>
              updateFilters({ sort: e.target.value as SortKey })
            }
            className="min-h-11 w-full rounded-xl border border-black/10 px-3 py-2.5 text-base outline-none ring-gl-gold focus:ring-2 sm:text-sm"
          >
            <option value="discount">Highest discount</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="name">Name A–Z</option>
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-black/20 bg-white p-8 text-center text-neutral-500">
          No products match your filters.
        </p>
      ) : (
        <>
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

          {hasMore && (
            <div className="flex justify-center pt-4">
              <button
                type="button"
                onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                className="min-h-11 w-full rounded-xl bg-gl-black px-6 py-3 text-sm font-medium text-white hover:bg-neutral-800 sm:w-auto"
              >
                Load more ({Math.min(PAGE_SIZE, filtered.length - visibleCount)}{" "}
                more)
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
