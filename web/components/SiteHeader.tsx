"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { DashboardStats } from "@/lib/types";
import { useWatchlist } from "./WatchlistProvider";

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/best-deals", label: "Best Deals", countKey: "best_deals" as const },
  { href: "/biggest-drops", label: "Price Drops" },
  { href: "/sold", label: "Sold" },
  { href: "/buy-signals", label: "Buy Signals", countKey: "buy_signals" as const },
  { href: "/products", label: "All Products", countKey: "products" as const },
  { href: "/brands", label: "Brands" },
  { href: "/sizes", label: "Sizes" },
  { href: "/compare", label: "Compare" },
  { href: "/my-list", label: "My List", watchlist: true },
];

interface SiteHeaderProps {
  stats: DashboardStats;
  counts?: Partial<Record<"best_deals" | "buy_signals" | "products" | "changes", number>>;
}

export function SiteHeader({ stats, counts = {} }: SiteHeaderProps) {
  const pathname = usePathname();
  const { items, ready } = useWatchlist();

  const countFor = (key?: (typeof NAV)[number]["countKey"]) => {
    if (!key) return undefined;
    if (key === "best_deals") return counts.best_deals ?? 20;
    if (key === "buy_signals") return counts.buy_signals ?? stats.buy_signals_count;
    if (key === "products") return counts.products ?? stats.total_products;
    if (key === "changes") return counts.changes ?? stats.price_changes_today;
    return undefined;
  };

  return (
    <header className="space-y-4 border-b border-black/10 pb-5 sm:pb-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5 sm:space-y-2">
          <p className="text-[10px] uppercase tracking-[0.2em] text-gl-gold sm:text-xs sm:tracking-[0.25em]">
            Galeries Lafayette Qatar
          </p>
          <h1 className="font-display text-2xl text-balance sm:text-3xl md:text-4xl">
            <Link href="/" className="hover:opacity-80">
              Offer Tracker
            </Link>
          </h1>
          <p className="max-w-2xl text-xs text-neutral-600 sm:text-sm">
            {stats.total_pages
              ? `${stats.total_products.toLocaleString()} products · ${stats.total_pages} pages`
              : "Run daily refresh to populate catalog."}
          </p>
        </div>
        <a
          href="https://www.galerieslafayette.qa/offer.html"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 w-full shrink-0 items-center justify-center rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm font-medium hover:bg-neutral-50 sm:w-auto"
        >
          Open store
        </a>
      </div>

      <nav
        className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
        aria-label="Main navigation"
      >
        {NAV.map(({ href, label, countKey, watchlist }) => {
          const active =
            pathname === href ||
            (href === "/my-list" && pathname.startsWith("/my-list"));
          const count = countKey
            ? countFor(countKey)
            : watchlist && ready && items.length > 0
              ? items.length
              : undefined;
          return (
            <Link
              key={href}
              href={href}
              className={`inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-gl-black text-white"
                  : "bg-white text-neutral-700 ring-1 ring-black/10 hover:bg-neutral-50"
              }`}
            >
              {label}
              {count !== undefined && (
                <span className="ml-1.5 opacity-70">({count.toLocaleString()})</span>
              )}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
