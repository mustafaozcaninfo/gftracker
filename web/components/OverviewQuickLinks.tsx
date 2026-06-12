"use client";

import Link from "next/link";
import { useWatchlist } from "./WatchlistProvider";

export interface QuickLinkData {
  href: string;
  title: string;
  desc: string;
  count: number;
  countLabel: string;
  tone: "deal" | "drop" | "signal" | "gone" | "browse" | "personal";
  watchlist?: boolean;
  featured?: boolean;
}

interface OverviewQuickLinksProps {
  links: QuickLinkData[];
}

const TONE_STYLES: Record<QuickLinkData["tone"], string> = {
  deal: "border-amber-200/90 bg-gradient-to-br from-amber-50 to-white",
  drop: "border-emerald-200/90 bg-gradient-to-br from-emerald-50 to-white",
  signal: "border-teal-200/90 bg-gradient-to-br from-teal-50 to-white",
  gone: "border-orange-200/90 bg-gradient-to-br from-orange-50 to-white",
  browse: "border-slate-200/90 bg-gradient-to-br from-slate-50 to-white",
  personal: "border-violet-200/90 bg-gradient-to-br from-violet-50 to-white",
};

export function OverviewQuickLinks({ links }: OverviewQuickLinksProps) {
  const { items, ready } = useWatchlist();

  const featured = links.filter((l) => l.featured);
  const browse = links.filter((l) => !l.featured && (l.tone === "browse" || l.tone === "personal"));
  const rest = links.filter((l) => !l.featured && l.tone !== "browse" && l.tone !== "personal");

  const renderCard = (link: QuickLinkData, large = false) => {
    const count = link.watchlist && ready ? items.length : link.count;
    const showCount = link.watchlist ? ready && count > 0 : count > 0;

    return (
      <Link
        key={link.href}
        href={link.href}
        className={`group flex flex-col justify-between rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${TONE_STYLES[link.tone]} ${
          large ? "min-h-[108px] sm:min-h-[120px] sm:p-5" : "min-h-[88px]"
        }`}
      >
        <div>
          {showCount ? (
            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-600 sm:text-xs">
              {count.toLocaleString()} {link.countLabel}
            </p>
          ) : (
            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400 sm:text-xs">
              {link.watchlist ? "Your list" : "Explore"}
            </p>
          )}
          <h3
            className={`mt-1 font-display text-gl-black group-hover:underline ${
              large ? "text-lg sm:text-xl" : "text-base sm:text-lg"
            }`}
          >
            {link.title}
          </h3>
        </div>
        <p className="mt-2 line-clamp-2 text-[11px] leading-snug text-neutral-600 sm:text-xs">
          {link.desc}
        </p>
      </Link>
    );
  };

  return (
    <section className="space-y-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
          Shortcuts
        </p>
        <h2 className="font-display text-xl sm:text-2xl">Where to go next</h2>
      </div>

      {featured.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
          {featured.map((link) => renderCard(link, true))}
        </div>
      )}

      {(rest.length > 0 || browse.length > 0) && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 sm:gap-3">
          {[...rest, ...browse].map((link) => renderCard(link))}
        </div>
      )}
    </section>
  );
}
