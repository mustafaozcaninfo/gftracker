import type { DashboardStats } from "@/lib/types";

interface StatsCardsProps {
  stats: DashboardStats;
  generatedAt: string;
}

const PRIMARY: {
  key: keyof DashboardStats;
  label: string;
  hint: string;
  suffix?: string;
}[] = [
  { key: "total_products", label: "In catalog", hint: "Active offer items" },
  { key: "buy_signals_count", label: "Buy signals", hint: "Near all-time low" },
  { key: "drops_today", label: "Drops today", hint: "Price cuts logged" },
  { key: "max_discount", label: "Top discount", hint: "Highest % off now", suffix: "%" },
];

const SECONDARY: { key: keyof DashboardStats; label: string; suffix?: string }[] = [
  { key: "sold_recent_48h", label: "Gone 48h" },
  { key: "price_changes_today", label: "Changes today" },
  { key: "avg_discount", label: "Avg off", suffix: "%" },
  { key: "days_tracked", label: "Days tracked" },
];

export function StatsCards({ stats, generatedAt }: StatsCardsProps) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
            Live snapshot
          </p>
          <h2 className="font-display text-2xl sm:text-3xl">Offer at a glance</h2>
        </div>
        <p className="text-xs text-neutral-500">Updated {generatedAt}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {PRIMARY.map(({ key, label, hint, suffix }) => (
          <div
            key={key}
            className="rounded-2xl border border-black/8 bg-white p-3 shadow-sm sm:p-4"
          >
            <p className="text-[10px] font-medium uppercase tracking-wide text-neutral-500 sm:text-xs">
              {label}
            </p>
            <p className="mt-1 font-display text-2xl tabular-nums text-gl-black sm:text-3xl">
              {(stats[key] ?? 0).toLocaleString()}
              {suffix}
            </p>
            <p className="mt-1 hidden text-[11px] text-neutral-500 sm:block">{hint}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {SECONDARY.map(({ key, label, suffix }) => (
          <span
            key={key}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs ring-1 ring-black/6"
          >
            <span className="text-neutral-500">{label}</span>
            <span className="font-medium tabular-nums text-gl-black">
              {(stats[key] ?? 0).toLocaleString()}
              {suffix}
            </span>
          </span>
        ))}
      </div>
    </section>
  );
}
