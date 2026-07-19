"use client";

import Link from "next/link";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useProductsCatalog } from "@/lib/catalog-client";
import {
  deriveFilterFacets,
  isBrandInCatalog,
  isGenderInCatalog,
  isSizeAvailable,
  productMatchesFilters,
} from "@/lib/catalog-filters";
import {
  type SortKey,
  buildProductsHref,
  parseProductFilters,
} from "@/lib/product-filters";
import { CatalogFilters } from "./CatalogFilters";
import { ProductCard } from "./ProductCard";

const PAGE_SIZE = 24;

export function ProductGrid() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { products, loading, error: catalogError } = useProductsCatalog();
  const error = catalogError;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filters = useMemo(
    () => parseProductFilters(searchParams),
    [searchParams],
  );
  const { brand, size, gender, maxprice, mindisc: minDiscount, sort } = filters;

  const [query, setQuery] = useState(filters.search);
  const [maxPriceInput, setMaxPriceInput] = useState(
    filters.maxprice > 0 ? String(filters.maxprice) : "",
  );
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    setQuery(filters.search);
  }, [filters.search]);

  useEffect(() => {
    setMaxPriceInput(filters.maxprice > 0 ? String(filters.maxprice) : "");
  }, [filters.maxprice]);

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
    const handle = window.setTimeout(() => {
      const next = Number(maxPriceInput) || 0;
      if (next === filters.maxprice) return;
      updateFilters({ maxprice: next });
    }, 400);
    return () => window.clearTimeout(handle);
  }, [maxPriceInput, filters.maxprice, updateFilters]);

  const facets = useMemo(
    () => deriveFilterFacets(products, filters, deferredQuery),
    [products, filters, deferredQuery],
  );

  // Size availability for auto-reset must use committed URL search, not mid-typing deferred query.
  const sizeFacets = useMemo(
    () => deriveFilterFacets(products, filters, filters.search),
    [products, filters],
  );

  useEffect(() => {
    if (loading || products.length === 0) return;

    const patches: Partial<typeof filters> = {};
    if (!isBrandInCatalog(brand, products)) patches.brand = "all";
    if (!isGenderInCatalog(gender, products)) patches.gender = "all";
    if (!isSizeAvailable(size, sizeFacets)) patches.size = "all";
    if (Object.keys(patches).length > 0) updateFilters(patches);
  }, [loading, products, sizeFacets, brand, gender, size, updateFilters]);

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
      <CatalogFilters
        filters={filters}
        searchQuery={deferredQuery}
        query={query}
        maxPriceInput={maxPriceInput}
        minDiscount={minDiscount}
        facets={facets}
        totalProducts={products.length}
        resultCount={filtered.length}
        onQueryChange={setQuery}
        onMaxPriceChange={setMaxPriceInput}
        onUpdate={updateFilters}
      />

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/20 bg-white p-8 text-center">
          <p className="text-neutral-600">No products match your filters.</p>
          <Link
            href="/products"
            className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-gl-black px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Clear all filters
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((product) => (
              <ProductCard
                key={product.product_id}
                product={product}
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
