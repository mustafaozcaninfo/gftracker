"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { DashboardStats } from "@/lib/types";
import { useWatchlist } from "./WatchlistProvider";

type NavTone = "home" | "deal" | "drop" | "signal" | "browse" | "gone" | "personal";

type CountKey = "best_deals" | "buy_signals" | "products" | "changes" | "sold";

interface NavItem {
  href: string;
  label: string;
  tone: NavTone;
  countKey?: CountKey;
  watchlist?: boolean;
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: "home",
    label: "",
    items: [{ href: "/", label: "Overview", tone: "home" }],
  },
  {
    id: "deals",
    label: "Deals",
    items: [
      { href: "/best-deals", label: "Best Deals", countKey: "best_deals", tone: "deal" },
      { href: "/biggest-drops", label: "Price Drops", countKey: "changes", tone: "drop" },
      { href: "/buy-signals", label: "Buy Signals", countKey: "buy_signals", tone: "signal" },
    ],
  },
  {
    id: "catalog",
    label: "Catalog",
    items: [
      { href: "/products", label: "All Products", countKey: "products", tone: "browse" },
      { href: "/brands", label: "Brands", tone: "browse" },
      { href: "/sizes", label: "Sizes", tone: "browse" },
    ],
  },
  {
    id: "activity",
    label: "Activity",
    items: [
      {
        href: "/price-changes",
        label: "Price Changes",
        countKey: "changes",
        tone: "drop",
      },
      { href: "/sold", label: "Sold", countKey: "sold", tone: "gone" },
    ],
  },
  {
    id: "yours",
    label: "Yours",
    items: [
      { href: "/compare", label: "Compare", tone: "personal" },
      { href: "/my-list", label: "My List", watchlist: true, tone: "personal" },
    ],
  },
];

const TONE: Record<NavTone, { idle: string; active: string }> = {
  home: {
    idle: "bg-neutral-100 text-neutral-800 ring-neutral-200",
    active: "bg-neutral-900 text-white ring-neutral-900",
  },
  deal: {
    idle: "bg-amber-50 text-amber-950 ring-amber-200/80",
    active: "bg-amber-600 text-white ring-amber-700",
  },
  drop: {
    idle: "bg-emerald-50 text-emerald-900 ring-emerald-200/80",
    active: "bg-emerald-700 text-white ring-emerald-800",
  },
  signal: {
    idle: "bg-teal-50 text-teal-900 ring-teal-200/80",
    active: "bg-teal-700 text-white ring-teal-800",
  },
  browse: {
    idle: "bg-slate-50 text-slate-800 ring-slate-200/80",
    active: "bg-slate-600 text-white ring-slate-700",
  },
  gone: {
    idle: "bg-orange-50 text-orange-950 ring-orange-200/80",
    active: "bg-orange-600 text-white ring-orange-700",
  },
  personal: {
    idle: "bg-violet-50 text-violet-900 ring-violet-200/80",
    active: "bg-violet-700 text-white ring-violet-800",
  },
};

interface SiteHeaderProps {
  stats: DashboardStats;
  counts?: Partial<Record<"best_deals" | "buy_signals" | "products" | "changes" | "sold", number>>;
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

  return (
    <header className="space-y-3 border-b border-black/10 pb-4 sm:pb-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-[10px] uppercase tracking-[0.2em] text-gl-gold">
            Galeries Lafayette Qatar
          </p>
          <h1 className="font-display text-xl sm:text-2xl md:text-3xl">
            <Link href="/" className="hover:opacity-80">
              Offer Tracker
            </Link>
          </h1>
          <p className="text-[11px] text-neutral-500 sm:text-xs">
            {stats.total_products > 0
              ? [
                  `${stats.total_products.toLocaleString()} products`,
                  stats.total_pages > 0 ? `${stats.total_pages} pages` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : "Awaiting first scrape"}
          </p>
        </div>
        <a
          href="https://www.galerieslafayette.qa/offer.html"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-9 w-full shrink-0 items-center justify-center rounded-lg border border-black/15 bg-white px-3 py-2 text-xs font-medium hover:bg-neutral-50 sm:w-auto sm:text-sm"
        >
          Open store
        </a>
      </div>

      <nav
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 scrollbar-none sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
        aria-label="Main navigation"
      >
        {NAV_GROUPS.map((group, groupIndex) => (
          <div
            key={group.id}
            className="flex shrink-0 items-center gap-1 sm:shrink"
          >
            {groupIndex > 0 && (
              <span
                className="mx-0.5 hidden h-4 w-px shrink-0 bg-black/10 sm:block"
                aria-hidden
              />
            )}
            {group.label ? (
              <span className="mr-0.5 hidden text-[9px] font-semibold uppercase tracking-wider text-neutral-400 sm:inline">
                {group.label}
              </span>
            ) : null}
            <div className="flex items-center gap-1">
              {group.items.map(({ href, label, countKey, watchlist, tone }) => {
                const active = isActive(href);
                const count = countKey
                  ? countFor(countKey)
                  : watchlist && ready && items.length > 0
                    ? items.length
                    : undefined;
                const styles = TONE[tone];
                const showCount =
                  count !== undefined &&
                  (countKey !== "sold" || count > 0) &&
                  (!watchlist || count > 0);

                return (
                  <Link
                    key={href}
                    href={href}
                    title={group.label ? `${group.label}: ${label}` : label}
                    className={`inline-flex min-h-8 shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition sm:min-h-9 sm:px-3 sm:text-[13px] ${
                      active ? styles.active : `${styles.idle} hover:brightness-[0.98]`
                    }`}
                  >
                    {label}
                    {showCount && (
                      <span
                        className={`ml-1 tabular-nums ${active ? "opacity-85" : "opacity-60"}`}
                      >
                        {count.toLocaleString()}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </header>
  );
}
