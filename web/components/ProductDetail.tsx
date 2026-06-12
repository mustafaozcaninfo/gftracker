"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Product, SoldProduct } from "@/lib/types";
import { formatDate, formatQAR } from "@/lib/format";
import { productGender } from "@/lib/gender";
import { buildProductsHref } from "@/lib/product-filters";
import { BrandLink } from "./BrandLink";
import { GoogleLensButton } from "./GoogleLensButton";
import { LikeButton } from "./LikeButton";
import { PriceHistoryChart } from "./PriceHistoryChart";
import { PriceSparkline } from "./PriceSparkline";
import { SimilarProducts } from "./SimilarProducts";

interface ProductDetailProps {
  productId: string;
}

export function ProductDetail({ productId }: ProductDetailProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [sold, setSold] = useState<SoldProduct | null>(null);
  const [history, setHistory] = useState<Array<[string, number, number]>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/data/products.json").then((r) => r.json()),
      fetch("/data/price_histories.json").then((r) => r.json()),
      fetch("/data/sold_products.json").then((r) => r.json()),
    ])
      .then(([productsData, historyData, soldData]) => {
        if (cancelled) return;
        const found = (productsData.products as Product[]).find(
          (p) => p.product_id === productId,
        );
        if (found) {
          setProduct(found);
          setSold(null);
        } else {
          const gone = [
            ...(soldData.sold_recent as SoldProduct[]),
            ...(soldData.sold_all as SoldProduct[]),
          ].find((p) => p.product_id === productId);
          setProduct(null);
          setSold(gone ?? null);
        }
        setHistory(
          (historyData.histories?.[productId] as Array<[string, number, number]>) ??
            [],
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  if (loading) {
    return (
      <p className="rounded-2xl border border-black/10 bg-white p-12 text-center text-neutral-500">
        Loading product…
      </p>
    );
  }

  if (!product && !sold) {
    return (
      <div className="rounded-2xl border border-dashed border-black/20 bg-white p-8 text-center">
        <p className="text-neutral-600">Product not found.</p>
        <Link
          href="/products"
          className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-gl-black px-5 py-2.5 text-sm font-medium text-white"
        >
          Back to catalog
        </Link>
      </div>
    );
  }

  if (sold && !product) {
    return (
      <section className="space-y-6">
        <Link href="/sold" className="text-sm text-neutral-500 hover:text-neutral-800">
          ← Sold / gone
        </Link>
        <div className="rounded-2xl border border-orange-200/80 bg-orange-50/60 p-4 text-sm text-orange-900">
          This item is no longer on the offer page — likely sold out or delisted.
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-black/10 bg-neutral-100">
            {sold.image_url ? (
              <Image
                src={sold.image_url}
                alt={sold.name}
                fill
                className="object-cover object-top opacity-80 grayscale"
                unoptimized
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center text-neutral-400">
                No image
              </div>
            )}
          </div>
          <div className="space-y-4">
            <BrandLink brand={sold.brand} />
            <h1 className="font-display text-2xl leading-tight">{sold.name}</h1>
            {sold.last_price != null && (
              <p className="text-xl font-medium">{formatQAR(sold.last_price)}</p>
            )}
            <p className="text-sm text-neutral-600">
              {sold.removed_at
                ? `Removed ${formatDate(sold.removed_at)}`
                : `Last seen ${formatDate(sold.last_seen_at)}`}
            </p>
            {history.length > 0 && <PriceHistoryChart points={history} />}
            <a
              href={sold.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center rounded-xl bg-gl-black px-5 py-2.5 text-sm font-medium text-white"
            >
              View on store
            </a>
          </div>
        </div>
      </section>
    );
  }

  if (!product) {
    return null;
  }

  const saved = product.old_price - product.current_price;

  return (
    <section className="space-y-6">
      <Link
        href={buildProductsHref({ brand: product.brand })}
        className="text-sm text-neutral-500 hover:text-neutral-800"
      >
        ← {product.brand}
      </Link>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-black/10 bg-neutral-100">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover object-top"
              unoptimized
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-neutral-400">
              No image
            </div>
          )}
          <GoogleLensButton product={product} />
        </div>

        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <BrandLink brand={product.brand} className="text-xs" />
              <h1 className="font-display text-2xl sm:text-3xl">{product.name}</h1>
              <p className="text-sm text-neutral-500">SKU {product.sku}</p>
            </div>
            <LikeButton product={product} />
          </div>

          {product.sizes && product.sizes.length > 0 && (
            <p className="text-sm text-neutral-600">
              <span className="font-medium text-neutral-500">Sizes: </span>
              {product.is_one_size
                ? "One Size"
                : product.sizes.join(", ")}
            </p>
          )}

          {productGender(product) && (
            <p className="text-sm text-neutral-600">
              <span className="font-medium text-neutral-500">Gender: </span>
              <Link
                href={buildProductsHref({ gender: productGender(product) as "men" | "women" | "kids" | "unisex" })}
                className="capitalize hover:underline"
              >
                {productGender(product)}
              </Link>
            </p>
          )}

          <div className="space-y-1">
            <div className="flex items-end gap-3">
              <p className="font-display text-3xl text-gl-black">
                {formatQAR(product.current_price)}
              </p>
              {product.sparkline && product.sparkline.length >= 2 && (
                <PriceSparkline values={product.sparkline} className="mb-1" />
              )}
            </div>
            <p className="text-neutral-400 line-through">
              {formatQAR(product.old_price)}
            </p>
            {saved > 0 && (
              <p className="text-sm text-emerald-700">
                Save {formatQAR(saved)} ({product.discount_percent}% off)
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {product.is_at_lowest && (
              <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold uppercase text-white">
                Buy now — at lowest
              </span>
            )}
            {product.lowest_price !== undefined && (
              <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-700">
                All-time low: {formatQAR(product.lowest_price)}
                {product.lowest_date && ` (${product.lowest_date})`}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href={product.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center rounded-xl bg-gl-black px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
            >
              View on store
            </a>
            <Link
              href={buildProductsHref({ brand: product.brand })}
              className="inline-flex min-h-11 items-center rounded-xl border border-black/10 px-5 py-2.5 text-sm font-medium hover:bg-neutral-50"
            >
              More from {product.brand}
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-black/10 bg-white p-4 sm:p-6">
        <h2 className="font-display text-xl">Price history</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Tracked {product.days_tracked ?? 0} day
          {(product.days_tracked ?? 0) === 1 ? "" : "s"}
        </p>
        <div className="mt-4">
          <PriceHistoryChart points={history} />
        </div>
      </div>

      <SimilarProducts product={product} />
    </section>
  );
}
