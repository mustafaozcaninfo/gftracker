"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useProductsCatalog } from "@/lib/catalog-client";
import { formatQAR } from "@/lib/format";
import type { PriceChange } from "@/lib/types";
import { decodeWatchlistShare, priceDelta } from "@/lib/watchlist";
import { useWatchlist } from "./WatchlistProvider";
import { MyListToolbar } from "./MyListToolbar";
import { PriceChanges } from "./PriceChanges";
import { WatchlistItemCard } from "./WatchlistItemCard";

type TabKey = "liked" | "changes";
type LikedSort = "recent" | "discount" | "price_asc" | "price_desc" | "name";

const TABS: { key: TabKey; label: string }[] = [
  { key: "liked", label: "Saved" },
  { key: "changes", label: "Price moves" },
];

interface MyListTabsProps {
  changes: PriceChange[];
}

function sortLiked<
  T extends {
    item: { liked_at: string; snapshot: { name: string } };
    current?: { discount_percent?: number; current_price?: number };
  },
>(rows: T[], sort: LikedSort): T[] {
  return [...rows].sort((a, b) => {
    switch (sort) {
      case "discount":
        return (
          (b.current?.discount_percent ?? 0) -
            (a.current?.discount_percent ?? 0) ||
          a.item.liked_at.localeCompare(b.item.liked_at)
        );
      case "price_asc":
        return (
          (a.current?.current_price ?? Number.POSITIVE_INFINITY) -
            (b.current?.current_price ?? Number.POSITIVE_INFINITY) ||
          a.item.liked_at.localeCompare(b.item.liked_at)
        );
      case "price_desc":
        return (
          (b.current?.current_price ?? 0) - (a.current?.current_price ?? 0) ||
          a.item.liked_at.localeCompare(b.item.liked_at)
        );
      case "name":
        return a.item.snapshot.name.localeCompare(b.item.snapshot.name);
      default:
        return b.item.liked_at.localeCompare(a.item.liked_at);
    }
  });
}

export function MyListTabs({ changes }: MyListTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items, remove, ready, importItems } = useWatchlist();
  const { products, loading } = useProductsCatalog();
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [likedSort, setLikedSort] = useState<LikedSort>("recent");

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

  const sortedLiked = useMemo(
    () => sortLiked(likedWithDelta, likedSort),
    [likedWithDelta, likedSort],
  );

  const droppedRows = likedWithDelta.filter(({ delta }) => delta.dropped);
  const droppedCount = droppedRows.length;
  const droppedSavings = droppedRows.reduce(
    (sum, { delta }) => sum + Math.abs(delta.amount),
    0,
  );
  const otherChangedCount = likedWithDelta.filter(
    ({ delta }) => delta.changed && !delta.dropped,
  ).length;

  const watchedChanges = useMemo(() => {
    if (!items.length) return [];
    const ids = new Set(items.map((item) => item.product_id));
    return changes.filter((change) => ids.has(change.product_id));
  }, [changes, items]);

  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
          Personal
        </p>
        <h2 className="font-display text-xl sm:text-2xl">My List</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Save items on this device — use ⇄ on any card to compare up to four products.
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
            className={`inline-flex min-h-11 shrink-0 items-center rounded-xl px-4 py-2.5 text-sm font-medium transition ${
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
              <p className="text-neutral-600">No saved products yet.</p>
              <p className="mt-2 text-sm text-neutral-500">
                Tap ♡ on a product or use ⇄ to add items for compare.
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
              {droppedCount > 0 && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
                  <span className="font-medium">{droppedCount}</span> saved item
                  {droppedCount === 1 ? "" : "s"} dropped in price — combined
                  savings of{" "}
                  <span className="font-medium">{formatQAR(droppedSavings)}</span>{" "}
                  vs when you liked them.
                </div>
              )}
              {otherChangedCount > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                  <span className="font-medium">{otherChangedCount}</span> saved
                  item{otherChangedCount === 1 ? "" : "s"} changed without a
                  price drop (rise or discount-only).
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-neutral-500">
                  {items.length} saved on this device
                </p>
                <label htmlFor="liked-sort" className="flex items-center gap-2 text-sm">
                  <span className="text-neutral-500">Sort</span>
                  <select
                    id="liked-sort"
                    value={likedSort}
                    onChange={(e) => setLikedSort(e.target.value as LikedSort)}
                    className="min-h-10 rounded-xl border border-black/10 px-3 py-2 text-sm outline-none ring-gl-gold focus:ring-2"
                  >
                    <option value="recent">Recently liked</option>
                    <option value="discount">Highest discount</option>
                    <option value="price_asc">Price: low to high</option>
                    <option value="price_desc">Price: high to low</option>
                    <option value="name">Name A–Z</option>
                  </select>
                </label>
              </div>

              <div className="grid gap-3">
                {sortedLiked.map(({ item, current }) => (
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
                Save products first to see their price moves here.
              </p>
              <Link
                href="/products"
                className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-gl-black px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Browse products
              </Link>
            </div>
          ) : watchedChanges.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-black/20 bg-white p-8 text-center text-neutral-500">
              No logged price changes for your saved items yet.
            </div>
          ) : (
            <PriceChanges
              changes={watchedChanges}
              title="Price moves on your list"
              subtitle="Changes for products you saved"
              hideHeader={false}
            />
          )}
        </div>
      )}
    </section>
  );
}
