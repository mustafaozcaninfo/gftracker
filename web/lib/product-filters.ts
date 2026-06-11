export type SortKey = "discount" | "price_asc" | "price_desc" | "name";

export const SORT_KEYS: SortKey[] = [
  "discount",
  "price_asc",
  "price_desc",
  "name",
];

export type GenderFilter = "all" | "men" | "women" | "kids" | "unisex";

export const GENDER_FILTERS: GenderFilter[] = [
  "all",
  "men",
  "women",
  "kids",
  "unisex",
];

export interface ProductFilters {
  search: string;
  brand: string;
  size: string;
  gender: GenderFilter;
  maxprice: number;
  mindisc: number;
  sort: SortKey;
}

export function parseMaxprice(value: string | null): number {
  const n = Number(value ?? "0");
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n);
}

export function parseSort(value: string | null): SortKey {
  if (value && SORT_KEYS.includes(value as SortKey)) {
    return value as SortKey;
  }
  return "discount";
}

export function parseMindisc(value: string | null): number {
  const n = Number(value ?? "0");
  if (!Number.isFinite(n)) return 0;
  return Math.min(70, Math.max(0, Math.round(n / 5) * 5));
}

export function parseGender(value: string | null): GenderFilter {
  if (value && GENDER_FILTERS.includes(value as GenderFilter)) {
    return value as GenderFilter;
  }
  return "all";
}

export function parseProductFilters(
  params: Pick<URLSearchParams, "get">,
): ProductFilters {
  return {
    search: params.get("search") ?? "",
    brand: params.get("brand") ?? "all",
    size: params.get("size") ?? "all",
    gender: parseGender(params.get("gender")),
    maxprice: parseMaxprice(params.get("maxprice")),
    mindisc: parseMindisc(params.get("mindisc")),
    sort: parseSort(params.get("sort")),
  };
}

export function buildProductsHref(
  filters: Partial<ProductFilters>,
): string {
  const params = new URLSearchParams();

  if (filters.search?.trim()) {
    params.set("search", filters.search.trim());
  }
  if (filters.brand && filters.brand !== "all") {
    params.set("brand", filters.brand);
  }
  if (filters.size && filters.size !== "all") {
    params.set("size", filters.size);
  }
  if (filters.gender && filters.gender !== "all") {
    params.set("gender", filters.gender);
  }
  if (filters.maxprice && filters.maxprice > 0) {
    params.set("maxprice", String(filters.maxprice));
  }
  if (filters.mindisc && filters.mindisc > 0) {
    params.set("mindisc", String(filters.mindisc));
  }
  if (filters.sort && filters.sort !== "discount") {
    params.set("sort", filters.sort);
  }

  const qs = params.toString();
  return qs ? `/products?${qs}` : "/products";
}
