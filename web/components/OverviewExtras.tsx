import Link from "next/link";
import type { MetaData } from "@/lib/data";
import type { PriceDrop } from "@/lib/types";
import { formatQAR } from "@/lib/format";
import { buildProductsHref } from "@/lib/product-filters";
import { DiscountHistogram } from "./DiscountHistogram";

interface OverviewExtrasProps {
  meta: MetaData;
  drops: PriceDrop[];
}

const BUDGET_LINKS = [
  { label: "Under 200 QAR", maxprice: 200 },
  { label: "Under 500 QAR", maxprice: 500 },
  { label: "Under 1,000 QAR", maxprice: 1000 },
  { label: "50%+ off", mindisc: 50 },
];

export function OverviewExtras({ meta, drops }: OverviewExtrasProps) {
  const history = meta.scrape_history ?? [];
  const topDrops = drops.slice(0, 5);

  return (
    <div className="space-y-6">
      <DiscountHistogram stats={meta.stats} />

      <section className="space-y-3 rounded-2xl border border-black/10 bg-white p-4 sm:p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
            Shop by budget
          </p>
          <h2 className="font-display text-xl">Quick filters</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {BUDGET_LINKS.map(({ label, maxprice, mindisc }) => (
            <Link
              key={label}
              href={buildProductsHref({ maxprice, mindisc })}
              className="rounded-full bg-neutral-100 px-4 py-2 text-sm font-medium hover:bg-neutral-200"
            >
              {label}
            </Link>
          ))}
          <Link
            href="/sizes"
            className="rounded-full bg-neutral-100 px-4 py-2 text-sm font-medium hover:bg-neutral-200"
          >
            Browse sizes
          </Link>
        </div>
      </section>

      {topDrops.length > 0 && (
        <section className="space-y-3 rounded-2xl border border-black/10 bg-white p-4 sm:p-6">
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                Latest
              </p>
              <h2 className="font-display text-xl">Biggest drops</h2>
            </div>
            <Link href="/biggest-drops" className="text-sm text-neutral-500 hover:text-neutral-800">
              View all →
            </Link>
          </div>
          <ul className="divide-y divide-black/5">
            {topDrops.map((drop) => (
              <li key={`${drop.product_id}-${drop.timestamp}`} className="flex gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/products/${drop.product_id}`}
                    className="font-medium hover:underline"
                  >
                    {drop.name}
                  </Link>
                  <p className="text-xs text-neutral-500">{drop.sku}</p>
                </div>
                <div className="shrink-0 text-right text-sm">
                  <p className="font-medium text-emerald-700">
                    −{formatQAR(drop.drop_amount)}
                  </p>
                  <p className="text-neutral-500">
                    {formatQAR(drop.old_current_price)} → {formatQAR(drop.new_current_price)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {history.length > 0 && (
        <section className="space-y-3 rounded-2xl border border-black/10 bg-white p-4 sm:p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
              Scraper
            </p>
            <h2 className="font-display text-xl">Recent runs</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px] text-left text-sm">
              <thead>
                <tr className="text-xs uppercase text-neutral-500">
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2 pr-4">Products</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {history.slice(0, 5).map((run) => (
                  <tr key={run.id}>
                    <td className="py-2 pr-4">{run.run_date}</td>
                    <td className="py-2 pr-4">{run.products_found.toLocaleString()}</td>
                    <td className="py-2 capitalize text-neutral-600">{run.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
