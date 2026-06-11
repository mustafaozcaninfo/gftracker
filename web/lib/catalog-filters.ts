import type { Product } from "./types";
import { productGender } from "./gender";
import type { ProductFilters } from "./product-filters";
import {
  SIZE_FILTER_MULTI,
  SIZE_FILTER_ONE,
  productMatchesSize,
  sortSizeLabels,
} from "./sizes";

export type FacetOmit = "brand" | "size" | "gender" | "search" | "maxprice" | "mindisc";

export function productMatchesFilters(
  product: Product,
  filters: ProductFilters,
  searchQuery: string,
  omit?: FacetOmit,
): boolean {
  const q = searchQuery.trim().toLowerCase();

  if (omit !== "brand" && filters.brand !== "all" && product.brand !== filters.brand) {
    return false;
  }
  if (omit !== "gender" && filters.gender !== "all" && productGender(product) !== filters.gender) {
    return false;
  }
  if (omit !== "size" && !productMatchesSize(product, filters.size)) {
    return false;
  }
  if (omit !== "maxprice" && filters.maxprice > 0 && (product.current_price ?? 0) > filters.maxprice) {
    return false;
  }
  if (omit !== "mindisc" && (product.discount_percent ?? 0) < filters.mindisc) {
    return false;
  }
  if (omit !== "search" && q) {
    const matches =
      product.name.toLowerCase().includes(q) ||
      product.brand.toLowerCase().includes(q) ||
      product.sku.includes(q);
    if (!matches) return false;
  }
  return true;
}

export interface FilterFacets {
  brands: string[];
  genders: string[];
  sizes: string[];
  hasOneSize: boolean;
  hasMultiSize: boolean;
  matchCount: number;
}

export function deriveFilterFacets(
  products: Product[],
  filters: ProductFilters,
  searchQuery: string,
): FilterFacets {
  const forBrand = products.filter((p) =>
    productMatchesFilters(p, filters, searchQuery, "brand"),
  );
  const forGender = products.filter((p) =>
    productMatchesFilters(p, filters, searchQuery, "gender"),
  );
  const forSize = products.filter((p) =>
    productMatchesFilters(p, filters, searchQuery, "size"),
  );
  const matched = products.filter((p) =>
    productMatchesFilters(p, filters, searchQuery),
  );

  const brands = [...new Set(forBrand.map((p) => p.brand).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b),
  );

  const genders = [
    ...new Set(forGender.map((p) => productGender(p)).filter(Boolean)),
  ].sort();

  const sizeLabels = sortSizeLabels([
    ...new Set(forSize.flatMap((p) => p.sizes ?? [])),
  ]);

  return {
    brands,
    genders,
    sizes: sizeLabels,
    hasOneSize: forSize.some((p) => p.is_one_size === true),
    hasMultiSize: forSize.some((p) => (p.sizes?.length ?? 0) > 1),
    matchCount: matched.length,
  };
}

export function isSizeAvailable(
  size: string,
  facets: FilterFacets,
): boolean {
  if (size === "all") return true;
  if (size === SIZE_FILTER_ONE) return facets.hasOneSize;
  if (size === SIZE_FILTER_MULTI) return facets.hasMultiSize;
  return facets.sizes.includes(size);
}

export function isGenderAvailable(gender: string, facets: FilterFacets): boolean {
  if (gender === "all") return true;
  return facets.genders.includes(gender);
}

export function isBrandAvailable(brand: string, facets: FilterFacets): boolean {
  if (brand === "all") return true;
  return facets.brands.includes(brand);
}

export function sizeLabel(size: string): string {
  if (size === SIZE_FILTER_ONE) return "One Size";
  if (size === SIZE_FILTER_MULTI) return "Multiple sizes";
  return size;
}
