import { useEffect, useState } from "react";
import type { DashboardMeta, ProductsCatalogExport } from "./types";

export type { ProductsCatalogExport };

const CATALOG_TTL_MS = 5 * 60 * 1000;

let cached: {
  data: ProductsCatalogExport;
  fetchedAt: number;
  generatedAt?: string;
} | null = null;
let inflight: Promise<ProductsCatalogExport> | null = null;

export function loadProductsCatalogClient(): Promise<ProductsCatalogExport> {
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      let generatedAt: string | undefined;
      try {
        const metaRes = await fetch("/data/meta.json");
        if (metaRes.ok) {
          const meta = (await metaRes.json()) as DashboardMeta;
          generatedAt = meta.generated_at;
        }
      } catch {
        // meta is optional for revalidation; products fetch still proceeds
      }

      if (
        cached &&
        generatedAt &&
        cached.generatedAt === generatedAt
      ) {
        return cached.data;
      }
      if (
        cached &&
        !generatedAt &&
        Date.now() - cached.fetchedAt < CATALOG_TTL_MS
      ) {
        return cached.data;
      }

      const res = await fetch("/data/products.json");
      if (!res.ok) throw new Error("Failed to load catalog");
      const data = (await res.json()) as ProductsCatalogExport;
      cached = { data, fetchedAt: Date.now(), generatedAt };
      return data;
    } catch (err) {
      throw err;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

/** Test helper — clears module cache between tests. */
export function resetProductsCatalogClientCache(): void {
  cached = null;
  inflight = null;
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
          // Prefer real counts from products when size_counts is missing.
          const counts: Record<string, number> = {};
          for (const product of data.products ?? []) {
            for (const size of product.sizes ?? []) {
              counts[size] = (counts[size] ?? 0) + 1;
            }
          }
          if (Object.keys(counts).length === 0) {
            for (const size of data.sizes) counts[size] = 1;
          }
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
