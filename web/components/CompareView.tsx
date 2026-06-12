"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import { formatQAR } from "@/lib/format";
import { buildProductsHref, productDetailHref } from "@/lib/product-filters";
import { useCompare } from "./CompareProvider";

export function CompareView() {
  const { ids, ready, remove, clear } = useCompare();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/data/products.json")
      .then((res) => res.json())
      .then((data: { products: Product[] }) => setProducts(data.products))
      .finally(() => setLoading(false));
  }, []);

  const selected = useMemo(
    () =>
      ids
        .map((id) => products.find((p) => p.product_id === id))
        .filter((p): p is Product => Boolean(p)),
    [ids, products],
  );

  if (!ready || loading) {
    return (
      <p className="rounded-2xl border border-black/10 bg-white p-8 text-center text-neutral-500">
        Loading compare…
      </p>
    );
  }

  if (ids.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-black/20 bg-white p-8 text-center">
        <p className="text-neutral-600">No products selected.</p>
        <p className="mt-2 text-sm text-neutral-500">
          Tap ⇄ on any product card to add up to 4 items.
        </p>
        <Link
          href="/products"
          className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-gl-black px-5 py-2.5 text-sm font-medium text-white"
        >
          Browse products
        </Link>
      </div>
    );
  }

  const rows: { label: string; render: (p: Product) => string }[] = [
    { label: "Brand", render: (p) => p.brand },
    { label: "Price", render: (p) => formatQAR(p.current_price) },
    { label: "Was", render: (p) => formatQAR(p.old_price) },
    { label: "Discount", render: (p) => `${p.discount_percent}%` },
    {
      label: "Sizes",
      render: (p) =>
        p.sizes?.length
          ? p.is_one_size
            ? "One Size"
            : p.sizes.slice(0, 6).join(", ")
          : "—",
    },
    {
      label: "Gender",
      render: (p) => (p.gender ? p.gender : "—"),
    },
    {
      label: "All-time low",
      render: (p) =>
        p.lowest_price != null ? formatQAR(p.lowest_price) : "—",
    },
    {
      label: "Tracked",
      render: (p) =>
        p.days_tracked != null ? `${p.days_tracked} days` : "—",
    },
  ];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
            Tools
          </p>
          <h2 className="font-display text-xl sm:text-2xl">Compare products</h2>
        </div>
        <button
          type="button"
          onClick={clear}
          className="text-sm text-neutral-500 hover:text-neutral-800"
        >
          Clear all
        </button>
      </div>

      {selected.length < 2 && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          Add at least 2 products to compare side by side.
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-black/10 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-black/10">
              <th className="p-3 text-xs uppercase text-neutral-500">Field</th>
              {selected.map((product) => (
                <th key={product.product_id} className="min-w-[160px] p-3 align-top">
                  <div className="space-y-2">
                    <Link
                      href={productDetailHref(product.product_id)}
                      className="relative block aspect-square overflow-hidden rounded-xl bg-neutral-100"
                    >
                      {product.image_url ? (
                        <Image
                          src={product.image_url}
                          alt=""
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : null}
                    </Link>
                    <Link
                      href={productDetailHref(product.product_id)}
                      className="line-clamp-2 font-medium hover:underline"
                    >
                      {product.name}
                    </Link>
                    <button
                      type="button"
                      onClick={() => remove(product.product_id)}
                      className="text-xs text-neutral-500 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-black/5">
                <td className="p-3 font-medium text-neutral-500">{row.label}</td>
                {selected.map((product) => (
                  <td key={product.product_id} className="p-3">
                    {row.render(product)}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td className="p-3 font-medium text-neutral-500">Actions</td>
              {selected.map((product) => (
                <td key={product.product_id} className="space-y-2 p-3">
                  <a
                    href={product.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sky-700 hover:underline"
                  >
                    Store →
                  </a>
                  <Link
                    href={buildProductsHref({ brand: product.brand })}
                    className="block text-neutral-600 hover:underline"
                  >
                    More {product.brand}
                  </Link>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
