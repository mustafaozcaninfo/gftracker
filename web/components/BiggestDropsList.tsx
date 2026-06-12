import type { PriceDrop } from "@/lib/types";
import { formatDate, formatQAR } from "@/lib/format";
import Link from "next/link";
import { productDetailHref } from "@/lib/product-filters";

interface BiggestDropsListProps {
  drops: PriceDrop[];
}

export function BiggestDropsList({ drops }: BiggestDropsListProps) {
  if (!drops.length) {
    return (
      <p className="rounded-2xl border border-dashed border-black/20 bg-white p-8 text-center text-neutral-500">
        No price drops recorded yet. Drops appear when hourly scrapes detect a lower price.
      </p>
    );
  }

  return (
    <>
      <div className="grid gap-3 md:hidden">
        {drops.map((drop) => (
          <article
            key={`${drop.product_id}-${drop.timestamp}`}
            className="rounded-2xl border border-black/10 bg-white p-4"
          >
            <Link
              href={productDetailHref(drop.product_id)}
              className="font-medium text-neutral-900 hover:underline"
            >
              {drop.name}
            </Link>
            <p className="text-xs text-neutral-500">SKU {drop.sku}</p>
            <div className="mt-2 flex flex-wrap items-baseline gap-2 text-sm">
              <span className="text-neutral-500 line-through">
                {formatQAR(drop.old_current_price)}
              </span>
              <span>→</span>
              <span className="font-medium text-emerald-700">
                {formatQAR(drop.new_current_price)}
              </span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                ↓ {formatQAR(drop.drop_amount)} ({drop.drop_percent}%)
              </span>
            </div>
            <p className="mt-2 text-xs text-neutral-500">
              {formatDate(drop.timestamp)}
            </p>
          </article>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-black/10 bg-white md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-black/10 bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Was → Now</th>
                <th className="px-4 py-3">Drop</th>
                <th className="px-4 py-3">When</th>
              </tr>
            </thead>
            <tbody>
              {drops.map((drop) => (
                <tr
                  key={`${drop.product_id}-${drop.timestamp}`}
                  className="border-b border-black/5 last:border-0"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={productDetailHref(drop.product_id)}
                      className="font-medium hover:underline"
                    >
                      {drop.name}
                    </Link>
                    <p className="text-xs text-neutral-500">SKU {drop.sku}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-neutral-500 line-through">
                      {formatQAR(drop.old_current_price)}
                    </span>
                    <span className="text-neutral-400"> → </span>
                    <span className="font-medium text-emerald-700">
                      {formatQAR(drop.new_current_price)}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-emerald-700">
                    ↓ {formatQAR(drop.drop_amount)} ({drop.drop_percent}%)
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {formatDate(drop.timestamp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
