import type { ReactNode } from "react";
import type { DashboardStats } from "@/lib/types";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

interface PageShellProps {
  stats: DashboardStats;
  source: string;
  generatedAt: string;
  counts?: Partial<Record<"best_deals" | "buy_signals" | "products" | "changes", number>>;
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
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <SiteHeader stats={stats} counts={counts} />
      {children}
      <SiteFooter source={source} generatedAt={generatedAt} />
    </div>
  );
}
