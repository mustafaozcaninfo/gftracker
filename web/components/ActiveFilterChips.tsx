"use client";

import Link from "next/link";
import {
  type ProductFilters,
  buildProductsHref,
} from "@/lib/product-filters";
import { sizeLabel } from "@/lib/catalog-filters";
import { formatQAR } from "@/lib/format";

interface ActiveFilterChipsProps {
  filters: ProductFilters;
  searchQuery: string;
}

export function ActiveFilterChips({ filters, searchQuery }: ActiveFilterChipsProps) {
  const chips: { key: string; label: string; href: string }[] = [];

  const q = searchQuery.trim();
  if (q) {
    chips.push({
      key: "search",
      label: `Search: ${q}`,
      href: buildProductsHref({ ...filters, search: "" }),
    });
  }
  if (filters.brand !== "all") {
    chips.push({
      key: "brand",
      label: `Brand: ${filters.brand}`,
      href: buildProductsHref({ ...filters, brand: "all" }),
    });
  }
  if (filters.gender !== "all") {
    chips.push({
      key: "gender",
      label: `Gender: ${filters.gender.charAt(0).toUpperCase()}${filters.gender.slice(1)}`,
      href: buildProductsHref({ ...filters, gender: "all" }),
    });
  }
  if (filters.size !== "all") {
    chips.push({
      key: "size",
      label: `Size: ${sizeLabel(filters.size)}`,
      href: buildProductsHref({ ...filters, size: "all" }),
    });
  }
  if (filters.maxprice > 0) {
    chips.push({
      key: "maxprice",
      label: `≤ ${formatQAR(filters.maxprice)}`,
      href: buildProductsHref({ ...filters, maxprice: 0 }),
    });
  }
  if (filters.mindisc > 0) {
    chips.push({
      key: "mindisc",
      label: `${filters.mindisc}%+ off`,
      href: buildProductsHref({ ...filters, mindisc: 0 }),
    });
  }
  if (filters.sort !== "discount") {
    const sortLabels: Record<string, string> = {
      price_asc: "Price ↑",
      price_desc: "Price ↓",
      name: "Name A–Z",
    };
    chips.push({
      key: "sort",
      label: `Sort: ${sortLabels[filters.sort] ?? filters.sort}`,
      href: buildProductsHref({ ...filters, sort: "discount" }),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs uppercase tracking-wide text-neutral-500">Active</span>
      {chips.map((chip) => (
        <Link
          key={chip.key}
          href={chip.href}
          className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-gl-black px-3 py-1 text-xs font-medium text-white hover:bg-neutral-800"
        >
          {chip.label}
          <span aria-hidden className="opacity-70">
            ×
          </span>
        </Link>
      ))}
      <Link
        href="/products"
        className="text-xs text-neutral-500 underline hover:text-neutral-800"
      >
        Clear all
      </Link>
    </div>
  );
}
