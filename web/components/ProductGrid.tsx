"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import { ProductCard } from "./ProductCard";

const PAGE_SIZE = 24;

interface ProductGridProps {
  brands: string[];
}

type SortKey = "discount" | "price_asc" | "price_desc" | "name";

export function ProductGrid({ brands }: ProductGridProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("all");
  const [minDiscount, setMinDiscount] = useState(0);
  const [sort, setSort] = useState<SortKey>("discount");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const deferredQuery = useDeferredValue(query);

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

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();

    const list = products.filter((p) => {
      if (brand !== "all" && p.brand !== brand) return false;
      if ((p.discount_percent ?? 0) < minDiscount) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.sku.includes(q)
      );
    });

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
  }, [products, deferredQuery, brand, minDiscount, sort]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [deferredQuery, brand, minDiscount, sort]);

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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
            Catalog
          </p>
          <h2 className="font-display text-2xl">All Products</h2>
        </div>
        <p className="text-sm text-neutral-500">
          Showing {visible.length.toLocaleString()} of {filtered.length.toLocaleString()}
          {filtered.length !== products.length &&
            ` (${products.length.toLocaleString()} total)`}
        </p>
      </div>

      <div className="grid gap-3 rounded-2xl border border-black/10 bg-white p-4 md:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-1 text-sm">
          <span className="text-neutral-500">Search</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Brand, name, SKU..."
            className="w-full rounded-xl border border-black/10 px-3 py-2 outline-none ring-gl-gold focus:ring-2"
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="text-neutral-500">Brand</span>
          <select
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="w-full rounded-xl border border-black/10 px-3 py-2 outline-none ring-gl-gold focus:ring-2"
          >
            <option value="all">All brands</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span className="text-neutral-500">Min discount ({minDiscount}%)</span>
          <input
            type="range"
            min={0}
            max={70}
            step={5}
            value={minDiscount}
            onChange={(e) => setMinDiscount(Number(e.target.value))}
            className="w-full accent-gl-red"
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="text-neutral-500">Sort by</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="w-full rounded-xl border border-black/10 px-3 py-2 outline-none ring-gl-gold focus:ring-2"
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                className="rounded-xl bg-gl-black px-6 py-3 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Load more ({Math.min(PAGE_SIZE, filtered.length - visibleCount)} more)
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
