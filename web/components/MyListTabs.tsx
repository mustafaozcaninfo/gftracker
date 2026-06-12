"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useProductsCatalog } from "@/lib/catalog-client";
import type { PriceChange } from "@/lib/types";
import { decodeWatchlistShare, priceDelta } from "@/lib/watchlist";
import { useWatchlist } from "./WatchlistProvider";
import { MyListToolbar } from "./MyListToolbar";
import { PriceChanges } from "./PriceChanges";
import { WatchlistItemCard } from "./WatchlistItemCard";

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
  const { items, remove, ready, importItems } = useWatchlist();
  const { products, loading } = useProductsCatalog();
  const [importNotice, setImportNotice] = useState<string | null>(null);

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
    const encoded = searchParams.get("import");
    if (!encoded) return;
    const decoded = decodeWatchlistShare(encoded);
    if (!decoded?.length) return;
    const added = importItems(decoded);
    setImportNotice(
      added > 0
        ? `Imported ${added} product${added === 1 ? "" : "s"} from shared list`
        : "Shared list already imported",
    );
    router.replace("/my-list", { scroll: false });
  }, [searchParams, importItems, router]);

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

  const watchedChanges = useMemo(() => {
    if (!items.length) return [];
    const ids = new Set(items.map((item) => item.product_id));
    return changes.filter((change) => ids.has(change.product_id));
  }, [changes, items]);

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

      {importNotice && (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
          {importNotice}
        </div>
      )}

      <MyListToolbar products={products} />

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
            id={`mylist-tab-${key}`}
            aria-controls={`mylist-panel-${key}`}
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
            {key === "changes" && watchedChanges.length > 0 && (
              <span className="ml-1.5 opacity-70">({watchedChanges.length})</span>
            )}
          </button>
        ))}
      </div>

      {tab === "liked" && (
        <div
          id="mylist-panel-liked"
          className="space-y-4"
          role="tabpanel"
          aria-labelledby="mylist-tab-liked"
        >
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

              <div className="grid gap-4">
                {likedWithDelta.map(({ item, current }) => (
                  <WatchlistItemCard
                    key={item.product_id}
                    item={item}
                    current={current}
                    onRemove={remove}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {tab === "changes" && (
        <div
          id="mylist-panel-changes"
          role="tabpanel"
          aria-labelledby="mylist-tab-changes"
          className="space-y-4"
        >
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-black/20 bg-white p-8 text-center">
              <p className="text-neutral-600">
                Like products first to see their price changes here.
              </p>
              <Link
                href="/price-changes"
                className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-gl-black px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
              >
                View all price changes
              </Link>
            </div>
          ) : (
            <PriceChanges changes={watchedChanges} />
          )}
        </div>
      )}
    </section>
  );
}
