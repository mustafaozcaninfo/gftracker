"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { DashboardStats } from "@/lib/types";
import { useWatchlist } from "./WatchlistProvider";

type CountKey = "best_deals" | "buy_signals" | "products" | "changes" | "sold";

interface NavItem {
  href: string;
  label: string;
  short?: string;
  countKey?: CountKey;
  watchlist?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Overview", short: "Home" },
  { href: "/best-deals", label: "Best Deals", countKey: "best_deals" },
  { href: "/biggest-drops", label: "Price Drops", short: "Drops", countKey: "changes" },
  { href: "/buy-signals", label: "Buy Signals", short: "Signals", countKey: "buy_signals" },
  { href: "/products", label: "Products", countKey: "products" },
  { href: "/brands", label: "Brands" },
  { href: "/sizes", label: "Sizes" },
  { href: "/sold", label: "Sold", countKey: "sold" },
  { href: "/price-changes", label: "All Changes", short: "Changes" },
  { href: "/my-list", label: "My List", watchlist: true },
  { href: "/compare", label: "Compare" },
];

interface SiteHeaderProps {
  stats: DashboardStats;
  counts?: Partial<Record<CountKey, number>>;
}

export function SiteHeader({ stats, counts = {} }: SiteHeaderProps) {
  const pathname = usePathname();
  const { items, ready } = useWatchlist();

  const countFor = (key?: CountKey) => {
    if (!key) return undefined;
    if (key === "best_deals") return counts.best_deals ?? 20;
    if (key === "buy_signals") return counts.buy_signals ?? stats.buy_signals_count;
    if (key === "products") return counts.products ?? stats.total_products;
    if (key === "changes") return counts.changes ?? stats.drops_today ?? stats.price_changes_today ?? 0;
    if (key === "sold") return stats.sold_recent_48h ?? 0;
    return undefined;
  };

  const isActive = (href: string) =>
    pathname === href ||
    (href === "/my-list" && pathname.startsWith("/my-list")) ||
    (href === "/products" && pathname.startsWith("/products/"));

  const subtitle =
    stats.total_products > 0
      ? [
          `${stats.total_products.toLocaleString()} products`,
          stats.total_pages > 0 ? `${stats.total_pages} pages` : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : "Awaiting first scrape";

  return (
    <header className="sticky top-0 z-40 -mx-3 border-b border-black/8 bg-gl-cream/92 px-3 pb-3 pt-1 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-3">
        <div className="flex items-start justify-between gap-3 pt-3">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-gl-gold">
              Galeries Lafayette Qatar
            </p>
            <h1 className="font-display text-xl leading-tight sm:text-2xl">
              <Link href="/" className="hover:opacity-80">
                GF Tracker
              </Link>
            </h1>
            <p className="mt-0.5 text-[11px] text-neutral-500 sm:text-xs">{subtitle}</p>
          </div>
          <a
            href="https://www.galerieslafayette.qa/offer.html"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 shrink-0 items-center rounded-xl border border-black/12 bg-white px-3.5 text-xs font-medium shadow-sm transition hover:border-gl-gold/40 hover:bg-white sm:min-h-11 sm:px-4 sm:text-sm"
          >
            Store
          </a>
        </div>

        <nav
          className="flex gap-1.5 overflow-x-auto rounded-2xl bg-white/70 p-1.5 shadow-sm ring-1 ring-black/6 scrollbar-none snap-x snap-mandatory sm:flex-wrap sm:overflow-visible sm:snap-none"
          aria-label="Main navigation"
        >
          {NAV_ITEMS.map(({ href, label, short, countKey, watchlist }) => {
            const active = isActive(href);
            const count = countKey
              ? countFor(countKey)
              : watchlist && ready && items.length > 0
                ? items.length
                : undefined;
            const showCount =
              count !== undefined &&
              (countKey !== "sold" || count > 0) &&
              (!watchlist || count > 0);

            return (
              <Link
                key={href}
                href={href}
                className={`inline-flex min-h-9 shrink-0 snap-start items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-medium transition sm:min-h-10 sm:text-[13px] ${
                  active
                    ? "bg-gl-black text-white shadow-sm"
                    : "text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                <span className="sm:hidden">{short ?? label}</span>
                <span className="hidden sm:inline">{label}</span>
                {showCount && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums leading-none ${
                      active ? "bg-white/20 text-white" : "bg-neutral-200/80 text-neutral-600"
                    }`}
                  >
                    {count > 999 ? `${Math.round(count / 1000)}k` : count.toLocaleString()}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
