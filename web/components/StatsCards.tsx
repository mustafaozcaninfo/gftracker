import type { DashboardStats } from "@/lib/types";

interface StatsCardsProps {
  stats: DashboardStats;
  generatedAt: string;
}

const items = [
  { key: "total_products", label: "Products in DB", suffix: "" },
  { key: "buy_signals_count", label: "Buy Signals", suffix: "" },
  { key: "days_tracked", label: "Days Tracked", suffix: "" },
  { key: "max_discount", label: "Best Discount", suffix: "%" },
  { key: "total_pages", label: "Offer Pages", suffix: "" },
  { key: "price_changes_today", label: "Changes Today", suffix: "" },
] as const;

export function StatsCards({ stats, generatedAt }: StatsCardsProps) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
            Live snapshot
          </p>
          <h2 className="font-display text-2xl">Overview</h2>
        </div>
        <p className="text-sm text-neutral-500">Updated {generatedAt}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {items.map(({ key, label, suffix }) => (
          <article
            key={key}
            className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm"
          >
            <p className="text-xs uppercase tracking-wide text-neutral-500">
              {label}
            </p>
            <p className="mt-2 font-display text-3xl text-gl-black">
              {stats[key]}
              {suffix}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
