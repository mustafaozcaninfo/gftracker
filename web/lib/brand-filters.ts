export type BrandSortKey =
  | "count"
  | "name_asc"
  | "name_desc"
  | "avg_disc"
  | "max_disc"
  | "price_asc";

const SORT_KEYS: BrandSortKey[] = [
  "count",
  "name_asc",
  "name_desc",
  "avg_disc",
  "max_disc",
  "price_asc",
];

export function parseBrandSort(value: string | null): BrandSortKey {
  if (value && SORT_KEYS.includes(value as BrandSortKey)) {
    return value as BrandSortKey;
  }
  return "count";
}

export function buildBrandsHref(opts: {
  search?: string;
  sort?: BrandSortKey;
}): string {
  const params = new URLSearchParams();
  const q = opts.search?.trim();
  if (q) params.set("q", q);
  if (opts.sort && opts.sort !== "count") params.set("sort", opts.sort);
  const qs = params.toString();
  return qs ? `/brands?${qs}` : "/brands";
}

export const BRAND_SORT_LABELS: Record<BrandSortKey, string> = {
  count: "Most products",
  name_asc: "Name A–Z",
  name_desc: "Name Z–A",
  avg_disc: "Highest avg discount",
  max_disc: "Highest max discount",
  price_asc: "Lowest starting price",
};
