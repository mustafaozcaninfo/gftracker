import type { ReactNode } from "react";
import type { DashboardStats } from "@/lib/types";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";
import { WatchlistDropBanner } from "./WatchlistDropBanner";

interface PageShellProps {
  stats: DashboardStats;
  source: string;
  generatedAt: string;
  counts?: Partial<Record<"best_deals" | "buy_signals" | "products" | "changes" | "sold", number>>;
  children: ReactNode;
}

export function PageShell({
  stats,
  source,
  generatedAt,
  counts,
  children,
}: PageShellProps) {
  return (
    <div className="mx-auto max-w-7xl overflow-x-hidden px-3 pb-6 sm:px-6 sm:pb-8 lg:px-8">
      <SiteHeader stats={stats} counts={counts} />
      <div className="space-y-6 pt-5 sm:space-y-8 sm:pt-6">
        <WatchlistDropBanner />
        <main id="main-content">{children}</main>
      </div>
      <SiteFooter source={source} generatedAt={generatedAt} />
    </div>
  );
}
