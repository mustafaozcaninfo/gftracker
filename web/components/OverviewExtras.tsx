import Link from "next/link";
import type { MetaData } from "@/lib/data";
import type { PriceDrop } from "@/lib/types";
import { formatQAR } from "@/lib/format";
import { productDetailHref } from "@/lib/product-filters";
import { DiscountHistogram } from "./DiscountHistogram";
import { OverviewQuickFilters } from "./OverviewQuickFilters";
import { RecentRunsList } from "./RecentRunsList";

interface OverviewExtrasProps {
  meta: MetaData;
  drops: PriceDrop[];
}

export function OverviewExtras({ meta, drops }: OverviewExtrasProps) {
  const topDrops = drops.slice(0, 5);
  const history = meta.scrape_history ?? [];

  return (
    <div className="space-y-6 lg:space-y-8">
      <OverviewQuickFilters />

      <div className="grid gap-6 lg:grid-cols-2">
        {topDrops.length > 0 ? (
          <section className="rounded-2xl border border-black/8 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-4 flex items-end justify-between gap-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
                  Latest
                </p>
                <h2 className="font-display text-xl sm:text-2xl">Biggest drops</h2>
              </div>
              <Link
                href="/biggest-drops"
                className="text-sm font-medium text-neutral-600 hover:text-gl-black"
              >
                View all →
              </Link>
            </div>
            <ul className="divide-y divide-black/6">
              {topDrops.map((drop) => (
                <li
                  key={`${drop.product_id}-${drop.timestamp}`}
                  className="flex items-start justify-between gap-3 py-3 first:pt-0"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      href={productDetailHref(drop.product_id)}
                      className="line-clamp-2 text-sm font-medium leading-snug hover:underline"
                    >
                      {drop.name}
                    </Link>
                    <p className="mt-0.5 text-[11px] text-neutral-500">{drop.sku}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-emerald-700">
                      −{formatQAR(drop.drop_amount)}
                    </p>
                    <p className="text-[11px] tabular-nums text-neutral-500">
                      {formatQAR(drop.old_current_price)} → {formatQAR(drop.new_current_price)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <section className="flex items-center justify-center rounded-2xl border border-dashed border-black/15 bg-white/60 p-8 text-center text-sm text-neutral-500">
            No price drops recorded yet.
          </section>
        )}

        <RecentRunsList runs={history} />
      </div>

      <DiscountHistogram stats={meta.stats} />
    </div>
  );
}
