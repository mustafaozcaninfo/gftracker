"use client";

import { useEffect, useState } from "react";
import type { Product } from "./types";

export interface ProductsCatalogData {
  products: Product[];
  brands?: string[];
  sizes?: string[];
  size_counts?: Record<string, number>;
  genders?: string[];
  gender_counts?: Record<string, number>;
}

let inflight: Promise<ProductsCatalogData> | null = null;

export function loadProductsCatalogClient(): Promise<ProductsCatalogData> {
  if (!inflight) {
    inflight = fetch("/data/products.json")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load catalog");
        return res.json() as Promise<ProductsCatalogData>;
      })
      .catch((err) => {
        inflight = null;
        throw err;
      });
  }
  return inflight;
}

export function useProductsCatalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sizeCounts, setSizeCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadProductsCatalogClient()
      .then((data) => {
        if (cancelled) return;
        setProducts(data.products ?? []);
        if (data.size_counts) {
          setSizeCounts(data.size_counts);
        } else if (data.sizes) {
          const counts: Record<string, number> = {};
          for (const size of data.sizes) counts[size] = 1;
          setSizeCounts(counts);
        }
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

  return { products, sizeCounts, loading, error };
}
