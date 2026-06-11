import type { DashboardStats } from "@/lib/types";

interface DiscountHistogramProps {
  stats: DashboardStats;
}

const BUCKET_ORDER = [
  "0-9",
  "10-19",
  "20-29",
  "30-39",
  "40-49",
  "50-59",
  "60-69",
  "70+",
];

export function DiscountHistogram({ stats }: DiscountHistogramProps) {
  const buckets = stats.discount_buckets;
  if (!buckets || Object.keys(buckets).length === 0) return null;

  const max = Math.max(...Object.values(buckets), 1);

  return (
    <section className="space-y-3 rounded-2xl border border-black/10 bg-white p-4 sm:p-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
          Distribution
        </p>
        <h2 className="font-display text-xl">Discount depth</h2>
        <p className="mt-1 text-sm text-neutral-600">
          {stats.high_discount_50_plus?.toLocaleString() ?? "—"} products at 50%+ off
          {stats.high_discount_60_plus != null &&
            ` · ${stats.high_discount_60_plus.toLocaleString()} at 60%+`}
        </p>
      </div>

      <div className="space-y-2">
        {BUCKET_ORDER.filter((key) => buckets[key] !== undefined).map((key) => {
          const count = buckets[key] ?? 0;
          const width = Math.max(4, Math.round((count / max) * 100));
          return (
            <div key={key} className="grid grid-cols-[3.5rem_1fr_3rem] items-center gap-2 text-sm">
              <span className="text-neutral-500">{key}%</span>
              <div className="h-3 overflow-hidden rounded-full bg-neutral-100">
                <div
                  className="h-full rounded-full bg-gl-gold"
                  style={{ width: `${width}%` }}
                />
              </div>
              <span className="text-right text-neutral-600">{count}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
