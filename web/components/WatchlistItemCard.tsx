"use client";

import Image from "next/image";
import type { Product } from "@/lib/types";
import { formatDate, formatQAR } from "@/lib/format";
import { buildProductsHref } from "@/lib/product-filters";
import type { WatchlistItem } from "@/lib/watchlist";
import { priceDelta } from "@/lib/watchlist";
import Link from "next/link";
import { BrandLink } from "./BrandLink";

interface WatchlistItemCardProps {
  item: WatchlistItem;
  current?: Product;
  onRemove: (productId: string) => void;
}

function formatSizes(sizes: string[] | undefined, isOneSize?: boolean): string | null {
  if (!sizes?.length) return null;
  if (isOneSize || (sizes.length === 1 && sizes[0].toLowerCase() === "one size")) {
    return "One Size";
  }
  const shown = sizes.slice(0, 10).join(", ");
  return sizes.length > 10 ? `${shown}…` : shown;
}

export function WatchlistItemCard({
  item,
  current,
  onRemove,
}: WatchlistItemCardProps) {
  const delta = priceDelta(item.snapshot, current);
  const imageUrl = current?.image_url || item.snapshot.image_url;
  const sizes = current?.sizes ?? item.snapshot.sizes;
  const isOneSize = current?.is_one_size ?? item.snapshot.is_one_size;
  const discount = current?.discount_percent ?? item.snapshot.discount_percent;
  const storeUrl = current?.url ?? item.snapshot.url;

  return (
    <article className="overflow-hidden rounded-2xl border border-black/10 bg-white">
      <div className="flex flex-col sm:flex-row">
        <div className="relative aspect-[4/5] w-full shrink-0 bg-neutral-100 sm:w-36 md:w-44">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={item.snapshot.name}
              fill
              sizes="(max-width: 640px) 100vw, 176px"
              className="object-cover object-top"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-neutral-400">
              No image
            </div>
          )}
          {discount > 0 && (
            <span className="absolute left-2 top-2 rounded-full bg-gl-red px-2 py-0.5 text-[10px] font-semibold text-white">
              {discount}% OFF
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <BrandLink brand={item.snapshot.brand} className="text-[10px] sm:text-xs" />
              <h3 className="font-medium leading-snug text-neutral-900">
                {item.snapshot.name}
              </h3>
              <p className="text-xs text-neutral-500">
                Liked {formatDate(item.liked_at)} · SKU {item.snapshot.sku}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onRemove(item.product_id)}
              className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-xl border border-black/10 px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50 sm:text-sm"
            >
              Remove
            </button>
          </div>

          {formatSizes(sizes, isOneSize) && (
            <p className="text-xs text-neutral-600">
              <span className="font-medium text-neutral-500">Sizes: </span>
              {formatSizes(sizes, isOneSize)}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {current?.is_at_lowest && (
              <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                Buy now
              </span>
            )}
            {current &&
              !current.is_at_lowest &&
              current.pct_above_lowest !== undefined &&
              current.pct_above_lowest <= 2 && (
                <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                  Near low
                </span>
              )}
            {current?.lowest_price !== undefined && (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-600">
                Low: {formatQAR(current.lowest_price)}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
            <span className="text-neutral-500 line-through">
              {formatQAR(item.snapshot.current_price)} when liked
            </span>
            {current ? (
              <>
                <span className="text-neutral-400">→</span>
                <span className="font-display text-xl text-gl-black">
                  {formatQAR(current.current_price)}
                </span>
                {current.old_price > current.current_price && (
                  <span className="text-xs text-neutral-400 line-through">
                    {formatQAR(current.old_price)}
                  </span>
                )}
                {delta.changed ? (
                  <span
                    className={
                      delta.dropped
                        ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800"
                        : "rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800"
                    }
                  >
                    {delta.dropped ? "↓" : "↑"} {formatQAR(Math.abs(delta.amount))}
                    {delta.discountChanged &&
                      ` · ${item.snapshot.discount_percent}% → ${current.discount_percent}%`}
                  </span>
                ) : (
                  <span className="text-xs text-neutral-500">No change since liked</span>
                )}
              </>
            ) : (
              <span className="text-xs text-neutral-500">
                Not in current catalog
              </span>
            )}
          </div>

          {current && (
            <div className="mt-auto flex flex-wrap gap-2 pt-1 text-xs text-neutral-500">
              {current.days_tracked !== undefined && current.days_tracked > 0 && (
                <span>Tracked {current.days_tracked}d</span>
              )}
              {current.page > 0 && <span>Page {current.page}</span>}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <a
              href={storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center rounded-xl bg-gl-black px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
            >
              View on store
            </a>
            <Link
              href={buildProductsHref({ brand: item.snapshot.brand })}
              className="inline-flex min-h-11 items-center rounded-xl border border-black/10 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              More from brand
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
