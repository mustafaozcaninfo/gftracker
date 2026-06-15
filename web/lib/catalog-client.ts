import { useEffect, useState } from "react";
import type { ProductsCatalogExport } from "./types";

export type { ProductsCatalogExport };

let inflight: Promise<ProductsCatalogExport> | null = null;

export function loadProductsCatalogClient(): Promise<ProductsCatalogExport> {
  if (!inflight) {
    inflight = fetch("/data/products.json")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load catalog");
        return res.json() as Promise<ProductsCatalogExport>;
      })
      .catch((err) => {
        inflight = null;
        throw err;
      });
  }
  return inflight;
}

export function useProductsCatalog() {
  const [products, setProducts] = useState<ProductsCatalogExport["products"]>([]);
  const [sizeCounts, setSizeCounts] = useState<ProductsCatalogExport["size_counts"]>(
    {},
  );
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
