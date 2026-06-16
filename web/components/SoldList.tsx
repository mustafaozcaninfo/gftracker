"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { SoldProduct } from "@/lib/types";
import { formatDate, formatQAR } from "@/lib/format";
import { buildProductsHref, productDetailHref } from "@/lib/product-filters";
import { BrandLink } from "./BrandLink";

type SoldTab = "recent" | "all";

const PAGE_SIZE = 24;

interface SoldListProps {
  soldRecent: SoldProduct[];
  soldAll: SoldProduct[];
  windowHours: number;
  soldRecent48h: number;
  soldTotal: number;
}

export function SoldList({
  soldRecent,
  soldAll,
  windowHours,
  soldRecent48h,
  soldTotal,
}: SoldListProps) {
  const [tab, setTab] = useState<SoldTab>("recent");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const items = tab === "recent" ? soldRecent : soldAll;
  const tabTotal = tab === "recent" ? soldRecent48h : soldTotal;
  const visible = items.slice(0, visibleCount);

  const emptyMessage = useMemo(() => {
    if (tab === "recent") {
      return `No products removed from the offer in the last ${windowHours} hours.`;
    }
    return "No sold / removed products recorded yet. They appear after an hourly scrape detects missing items.";
  }, [tab, windowHours]);

  if (!soldRecent.length && !soldAll.length) {
    return (
      <p className="rounded-2xl border border-dashed border-black/20 bg-white p-8 text-center text-neutral-500">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-600">
        {soldRecent48h.toLocaleString()} gone in {windowHours}h (Qatar time) ·{" "}
        {soldTotal.toLocaleString()} total removed · showing {visible.length} of{" "}
        {items.length}
        {tabTotal > items.length && (
          <span className="text-neutral-400">
            {" "}
            ({tabTotal.toLocaleString()} tracked)
          </span>
        )}
      </p>

      <div className="flex gap-2" role="tablist" aria-label="Sold product views">
        {(
          [
            { key: "recent" as const, label: `Last ${windowHours}h`, count: soldRecent48h },
            { key: "all" as const, label: "All sold", count: soldTotal },
          ] as const
        ).map(({ key, label, count }) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`sold-tab-${key}`}
            aria-controls={`sold-panel-${key}`}
            aria-selected={tab === key}
            onClick={() => {
              setTab(key);
              setVisibleCount(PAGE_SIZE);
            }}
            className={`inline-flex min-h-10 items-center rounded-full px-4 py-2 text-sm font-medium transition ${
              tab === key
                ? "bg-gl-black text-white"
                : "bg-white text-neutral-700 ring-1 ring-black/10 hover:bg-neutral-50"
            }`}
          >
            {label}
            {count > 0 && <span className="ml-1.5 opacity-70">({count.toLocaleString()})</span>}
          </button>
        ))}
      </div>

      <div
        id={`sold-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`sold-tab-${tab}`}
      >
        {items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-black/20 bg-white p-8 text-center text-neutral-500">
            {emptyMessage}
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((item) => (
                <SoldCard key={item.product_id} item={item} />
              ))}
            </div>
            {visibleCount < items.length && (
              <div className="flex justify-center pt-4">
                <button
                  type="button"
                  onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                  className="min-h-11 w-full rounded-xl bg-gl-black px-6 py-3 text-sm font-medium text-white hover:bg-neutral-800 sm:w-auto"
                >
                  Load more
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SoldCard({ item }: { item: SoldProduct }) {
  const saved =
    item.last_old_price != null && item.last_price != null
      ? item.last_old_price - item.last_price
      : 0;

  return (
    <article className="flex gap-3 rounded-2xl border border-black/10 bg-white p-3 sm:p-4">
      <Link
        href={productDetailHref(item.product_id)}
        className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-neutral-100"
      >
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt=""
            fill
            className="object-cover object-top opacity-80 grayscale"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] text-neutral-400">
            No img
          </div>
        )}
        <span className="absolute left-1 top-1 rounded bg-neutral-900/80 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
          Sold
        </span>
      </Link>

      <div className="min-w-0 flex-1 space-y-1">
        <BrandLink brand={item.brand} className="text-[10px]" />
        <h3 className="line-clamp-2 text-sm font-medium leading-snug">
          <Link href={productDetailHref(item.product_id)} className="hover:underline">
            {item.name}
          </Link>
        </h3>
        {item.last_price != null && (
          <p className="text-sm">
            <span className="font-medium">{formatQAR(item.last_price)}</span>
            {item.last_discount != null && item.last_discount > 0 && (
              <span className="ml-2 text-xs text-neutral-500">
                {item.last_discount}% off
              </span>
            )}
          </p>
        )}
        {saved > 0 && (
          <p className="text-[11px] text-neutral-500">
            Was {formatQAR(item.last_old_price!)}
          </p>
        )}
        <p className="text-[11px] text-neutral-500">
          {item.removed_at
            ? `Removed ${formatDate(item.removed_at)}`
            : `Last seen ${formatDate(item.last_seen_at)}`}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            href={buildProductsHref({ brand: item.brand })}
            className="text-[11px] text-neutral-600 hover:underline"
          >
            More {item.brand}
          </Link>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-neutral-400 hover:underline"
          >
            Store link
          </a>
        </div>
      </div>
    </article>
  );
}
