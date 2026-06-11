import type { DashboardStats } from "@/lib/types";

interface StatsCardsProps {
  stats: DashboardStats;
  generatedAt: string;
}

const items: {
  key: keyof DashboardStats;
  label: string;
  suffix?: string;
  accent?: string;
}[] = [
  { key: "total_products", label: "Products", accent: "border-l-slate-400" },
  { key: "buy_signals_count", label: "Buy signals", accent: "border-l-teal-500" },
  { key: "price_changes_today", label: "Changes", accent: "border-l-emerald-500" },
  { key: "sold_recent_48h", label: "Gone 48h", accent: "border-l-orange-500" },
  { key: "max_discount", label: "Top disc.", suffix: "%", accent: "border-l-amber-500" },
  { key: "days_tracked", label: "Days", accent: "border-l-neutral-400" },
];

export function StatsCards({ stats, generatedAt }: StatsCardsProps) {
  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-neutral-500">
          Live snapshot
        </p>
        <p className="text-[10px] text-neutral-400">Updated {generatedAt}</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {items.map(({ key, label, suffix, accent }) => (
          <div
            key={key}
            className={`inline-flex min-w-0 items-baseline gap-1.5 rounded-md border border-black/8 bg-white py-1 pl-2 pr-2.5 text-xs shadow-sm border-l-2 ${accent ?? "border-l-neutral-300"}`}
          >
            <span className="truncate text-[10px] text-neutral-500">{label}</span>
            <span className="shrink-0 font-display text-sm font-medium tabular-nums text-gl-black">
              {(stats[key] ?? 0).toLocaleString()}
              {suffix}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
