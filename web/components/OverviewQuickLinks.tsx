"use client";

import Link from "next/link";
import { useWatchlist } from "./WatchlistProvider";

export interface QuickLinkData {
  href: string;
  title: string;
  desc: string;
  count: number;
  countLabel: string;
  tone: string;
  watchlist?: boolean;
}

interface OverviewQuickLinksProps {
  links: QuickLinkData[];
}

export function OverviewQuickLinks({ links }: OverviewQuickLinksProps) {
  const { items, ready } = useWatchlist();

  return (
    <section className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
      {links.map((link) => {
        const count =
          link.watchlist && ready ? items.length : link.count;
        const showCount = link.watchlist ? ready && count > 0 : count > 0;

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`min-h-[76px] rounded-xl border p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:min-h-0 sm:p-4 ${link.tone}`}
          >
            {showCount ? (
              <p className="text-[10px] font-medium uppercase tracking-wide opacity-80 sm:text-xs">
                {count.toLocaleString()} {link.countLabel}
              </p>
            ) : (
              <p className="text-[10px] font-medium uppercase tracking-wide opacity-60 sm:text-xs">
                {link.watchlist ? "Personal" : "—"}
              </p>
            )}
            <h2 className="mt-0.5 font-display text-sm sm:text-lg">{link.title}</h2>
            <p className="mt-0.5 line-clamp-2 text-[11px] text-neutral-600 sm:text-xs">
              {link.desc}
            </p>
          </Link>
        );
      })}
    </section>
  );
}
