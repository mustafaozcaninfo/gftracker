import Link from "next/link";
import { buildProductsHref } from "@/lib/product-filters";

const FILTER_GROUPS = [
  {
    title: "Budget",
    items: [
      { label: "Under 200 QAR", maxprice: 200 },
      { label: "Under 500 QAR", maxprice: 500 },
      { label: "Under 1,000 QAR", maxprice: 1000 },
    ],
  },
  {
    title: "Discount",
    items: [
      { label: "30%+ off", mindisc: 30 },
      { label: "50%+ off", mindisc: 50 },
      { label: "70%+ off", mindisc: 70 },
    ],
  },
  {
    title: "Audience",
    items: [
      { label: "Women", gender: "women" as const },
      { label: "Men", gender: "men" as const },
      { label: "Kids", gender: "kids" as const },
      { label: "Unisex", gender: "unisex" as const },
    ],
  },
] as const;

export function OverviewQuickFilters() {
  return (
    <section className="rounded-2xl border border-black/8 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
            Catalog
          </p>
          <h2 className="font-display text-xl sm:text-2xl">Quick filters</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Jump into the full catalog with a preset — combine with brand or size on the products page.
          </p>
        </div>
        <Link
          href="/products"
          className="text-sm font-medium text-neutral-600 underline-offset-2 hover:text-gl-black hover:underline"
        >
          All products →
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {FILTER_GROUPS.map((group) => (
          <div key={group.title} className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
              {group.title}
            </p>
            <div className="flex flex-col gap-1.5">
              {group.items.map((item) => (
                <Link
                  key={item.label}
                  href={buildProductsHref(item)}
                  className="rounded-xl bg-gl-cream px-3 py-2.5 text-sm font-medium text-gl-black transition hover:bg-neutral-200/60"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-t border-black/6 pt-4">
        <Link
          href="/sizes"
          className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Browse by size
        </Link>
        <Link
          href="/brands"
          className="rounded-full bg-white px-4 py-2 text-sm font-medium ring-1 ring-black/10 hover:bg-neutral-50"
        >
          Browse brands
        </Link>
        <Link
          href={buildProductsHref({ mindisc: 50, sort: "price_asc" })}
          className="rounded-full bg-white px-4 py-2 text-sm font-medium ring-1 ring-black/10 hover:bg-neutral-50"
        >
          Cheapest 50%+ off
        </Link>
      </div>
    </section>
  );
}
