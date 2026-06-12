import Link from "next/link";
import type { PriceChange } from "@/lib/types";
import { formatDate, formatQAR } from "@/lib/format";
import { productDetailHref } from "@/lib/product-filters";

interface PriceChangesProps {
  changes: PriceChange[];
}

export function PriceChanges({ changes }: PriceChangesProps) {
  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
          History
        </p>
        <h2 className="font-display text-xl sm:text-2xl">Recent Price Changes</h2>
      </div>

      {changes.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-black/20 bg-white p-8 text-center text-neutral-500">
          No price changes recorded yet.
        </p>
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {changes.map((change) => {
              const priceDown =
                change.new_current_price < change.old_current_price;
              return (
                <article
                  key={`${change.product_id}-${change.timestamp}-card`}
                  className="rounded-2xl border border-black/10 bg-white p-4"
                >
                  <p className="font-medium text-neutral-900">
                    <Link
                      href={productDetailHref(change.product_id)}
                      className="hover:underline"
                    >
                      {change.name}
                    </Link>
                  </p>
                  <p className="text-xs text-neutral-500">SKU {change.sku}</p>
                  <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
                    <span
                      className={
                        priceDown ? "text-emerald-700" : "text-gl-red"
                      }
                    >
                      {formatQAR(change.old_current_price)}
                    </span>
                    <span className="text-neutral-400">→</span>
                    <span className="font-medium">
                      {formatQAR(change.new_current_price)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-neutral-600">
                    {change.old_discount_percent}% →{" "}
                    <span className="font-medium">
                      {change.new_discount_percent}%
                    </span>
                  </p>
                  <p className="mt-2 text-xs text-neutral-500">
                    {formatDate(change.timestamp)}
                  </p>
                </article>
              );
            })}
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-black/10 bg-white md:block">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-black/10 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Discount</th>
                    <th className="px-4 py-3">When</th>
                  </tr>
                </thead>
                <tbody>
                  {changes.map((change) => {
                    const priceDown =
                      change.new_current_price < change.old_current_price;
                    return (
                      <tr
                        key={`${change.product_id}-${change.timestamp}`}
                        className="border-b border-black/5 last:border-0"
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-neutral-900">
                            <Link
                              href={productDetailHref(change.product_id)}
                              className="hover:underline"
                            >
                              {change.name}
                            </Link>
                          </p>
                          <p className="text-xs text-neutral-500">
                            SKU {change.sku}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={
                              priceDown ? "text-emerald-700" : "text-gl-red"
                            }
                          >
                            {formatQAR(change.old_current_price)}
                          </span>
                          <span className="text-neutral-400"> → </span>
                          <span className="font-medium">
                            {formatQAR(change.new_current_price)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {change.old_discount_percent}% →{" "}
                          <span className="font-medium">
                            {change.new_discount_percent}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-neutral-500">
                          {formatDate(change.timestamp)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
