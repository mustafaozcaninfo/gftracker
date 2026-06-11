"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { PriceChange, Product } from "@/lib/types";
import { formatDate, formatQAR } from "@/lib/format";
import { priceDelta } from "@/lib/watchlist";
import { useWatchlist } from "./WatchlistProvider";
import { PriceChanges } from "./PriceChanges";

type TabKey = "liked" | "changes";

const TABS: { key: TabKey; label: string }[] = [
  { key: "liked", label: "Liked" },
  { key: "changes", label: "Price Changes" },
];

interface MyListTabsProps {
  changes: PriceChange[];
}

export function MyListTabs({ changes }: MyListTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items, remove, ready } = useWatchlist();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const tab: TabKey =
    searchParams.get("tab") === "changes" ? "changes" : "liked";

  const setTab = useCallback(
    (next: TabKey) => {
      const href = next === "changes" ? "/my-list?tab=changes" : "/my-list";
      router.replace(href, { scroll: false });
    },
    [router],
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/data/products.json")
      .then((res) => res.json())
      .then((data: { products: Product[] }) => {
        if (!cancelled) setProducts(data.products);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const productMap = useMemo(
    () => new Map(products.map((p) => [p.product_id, p])),
    [products],
  );

  const likedWithDelta = useMemo(
    () =>
      items.map((item) => ({
        item,
        current: productMap.get(item.product_id),
        delta: priceDelta(item.snapshot, productMap.get(item.product_id)),
      })),
    [items, productMap],
  );

  const changedLiked = likedWithDelta.filter(({ delta }) => delta.changed);

  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
          Personal
        </p>
        <h2 className="font-display text-xl sm:text-2xl">My List</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Like products to track price moves on this device.
        </p>
      </div>

      <div
        className="flex gap-2 overflow-x-auto pb-1 scrollbar-none"
        role="tablist"
        aria-label="My list sections"
      >
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-4 py-2.5 text-sm font-medium transition ${
              tab === key
                ? "bg-gl-black text-white"
                : "bg-white text-neutral-700 ring-1 ring-black/10 hover:bg-neutral-50"
            }`}
          >
            {label}
            {key === "liked" && items.length > 0 && (
              <span className="ml-1.5 opacity-70">({items.length})</span>
            )}
            {key === "changes" && changes.length > 0 && (
              <span className="ml-1.5 opacity-70">({changes.length})</span>
            )}
          </button>
        ))}
      </div>

      {tab === "liked" && (
        <div className="space-y-4" role="tabpanel">
          {!ready || loading ? (
            <p className="rounded-2xl border border-black/10 bg-white p-8 text-center text-neutral-500">
              Loading your list…
            </p>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-black/20 bg-white p-8 text-center">
              <p className="text-neutral-600">No liked products yet.</p>
              <p className="mt-2 text-sm text-neutral-500">
                Tap ♡ on any product card to start tracking.
              </p>
              <Link
                href="/products"
                className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-gl-black px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Browse products
              </Link>
            </div>
          ) : (
            <>
              {changedLiked.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                  <p className="font-medium">
                    {changedLiked.length} liked product
                    {changedLiked.length === 1 ? "" : "s"} changed since you saved
                    them.
                  </p>
                </div>
              )}

              <div className="grid gap-3">
                {likedWithDelta.map(({ item, current, delta }) => (
                  <article
                    key={item.product_id}
                    className="rounded-2xl border border-black/10 bg-white p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-1">
                        <p className="text-[10px] uppercase tracking-wide text-gl-gold sm:text-xs">
                          {item.snapshot.brand}
                        </p>
                        <h3 className="font-medium text-neutral-900">
                          {item.snapshot.name}
                        </h3>
                        <p className="text-xs text-neutral-500">
                          Liked {formatDate(item.liked_at)} · SKU {item.snapshot.sku}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(item.product_id)}
                        className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-black/10 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                      <span className="text-neutral-500 line-through">
                        {formatQAR(item.snapshot.current_price)} when liked
                      </span>
                      {current ? (
                        <>
                          <span className="text-neutral-400">→</span>
                          <span className="font-display text-lg text-gl-black">
                            {formatQAR(current.current_price)}
                          </span>
                          {delta.changed && (
                            <span
                              className={
                                delta.dropped
                                  ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800"
                                  : "rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800"
                              }
                            >
                              {delta.dropped ? "↓" : "↑"}{" "}
                              {formatQAR(Math.abs(delta.amount))}
                              {delta.discountChanged &&
                                ` · ${item.snapshot.discount_percent}% → ${current.discount_percent}%`}
                            </span>
                          )}
                          {!delta.changed && (
                            <span className="text-xs text-neutral-500">
                              No change since liked
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-neutral-500">
                          Product no longer in catalog
                        </span>
                      )}
                    </div>

                    {current && (
                      <a
                        href={current.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-gl-black px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
                      >
                        View on store
                      </a>
                    )}
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {tab === "changes" && (
        <div role="tabpanel">
          <PriceChanges changes={changes} />
        </div>
      )}
    </section>
  );
}
