"use client";

import { useMemo } from "react";
import { useProductsCatalog } from "@/lib/catalog-client";
import type { Product } from "@/lib/types";
import { ProductCard } from "./ProductCard";

interface SimilarProductsProps {
  product: Product;
}

function scoreSimilarity(base: Product, candidate: Product): number {
  let score = 0;
  if (candidate.brand === base.brand) score += 40;
  const priceDiff = Math.abs(candidate.current_price - base.current_price);
  const band = Math.max(base.current_price * 0.3, 150);
  if (priceDiff <= band) score += 30 * (1 - priceDiff / band);
  score += Math.min(candidate.discount_percent, base.discount_percent + 10) * 0.5;
  return score;
}

export function SimilarProducts({ product }: SimilarProductsProps) {
  const { products } = useProductsCatalog();

  const similar = useMemo(
    () =>
      products
        .filter((p) => p.product_id !== product.product_id)
        .map((p) => ({ product: p, score: scoreSimilarity(product, p) }))
        .filter(({ score }) => score >= 25)
        .sort((a, b) => b.score - a.score)
        .slice(0, 4)
        .map(({ product: p }) => p),
    [products, product],
  );

  if (similar.length === 0) return null;

  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
          You may also like
        </p>
        <h2 className="font-display text-xl">Similar deals</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {similar.map((item) => (
          <ProductCard key={item.product_id} product={item} lazyImage />
        ))}
      </div>
    </section>
  );
}
