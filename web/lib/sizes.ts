import type { Product } from "./types";

export const SIZE_FILTER_ONE = "one-size";
export const SIZE_FILTER_MULTI = "multi";

export function productMatchesSize(
  product: Product,
  sizeFilter: string,
): boolean {
  if (!sizeFilter || sizeFilter === "all") return true;

  const sizes = product.sizes ?? [];

  if (sizeFilter === SIZE_FILTER_ONE) {
    return product.is_one_size === true;
  }
  if (sizeFilter === SIZE_FILTER_MULTI) {
    return sizes.length > 1;
  }

  const target = sizeFilter.toLowerCase();
  return sizes.some((size) => size.toLowerCase() === target);
}

export function sortSizeLabels(labels: string[]): string[] {
  return [...labels].sort((a, b) => {
    const aOne = a.toLowerCase() === "one size";
    const bOne = b.toLowerCase() === "one size";
    if (aOne !== bOne) return aOne ? -1 : 1;
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
  });
}
