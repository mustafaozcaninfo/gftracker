export interface Product {
  product_id: string;
  sku: string;
  name: string;
  brand: string;
  current_price: number;
  old_price: number;
  discount_percent: number;
  url: string;
  image_url?: string;
  sizes?: string[];
  is_one_size?: boolean;
  gender?: string;
  sparkline?: number[];
  timestamp: string;
  page: number;
  lowest_price?: number;
  lowest_date?: string;
  is_at_lowest?: boolean;
  pct_above_lowest?: number;
  savings_vs_peak?: number;
  days_tracked?: number;
  price_date?: string;
  first_seen_at?: string;
}

export interface PriceChange {
  product_id: string;
  sku: string;
  name: string;
  old_current_price: number;
  new_current_price: number;
  old_discount_percent: number;
  new_discount_percent: number;
  timestamp: string;
  price_date?: string;
}

export interface PriceDrop extends PriceChange {
  drop_amount: number;
  drop_percent: number;
}

export interface BrandStats {
  count: number;
  avg_discount: number;
  max_discount: number;
  min_price: number | null;
}

export interface ScrapeRun {
  id: number;
  run_date: string;
  started_at: string;
  completed_at: string | null;
  total_pages: number;
  pages_scraped: number;
  products_found: number;
  status: string;
}

export interface SoldProduct {
  product_id: string;
  sku: string;
  name: string;
  brand: string;
  url: string;
  image_url?: string;
  sizes?: string[];
  is_one_size?: boolean;
  gender?: string;
  last_seen_at: string;
  removed_at?: string;
  last_price?: number;
  last_old_price?: number;
  last_discount?: number;
  last_price_date?: string;
}

export interface DashboardStats {
  total_products: number;
  total_pages: number;
  pages_scraped: number;
  avg_discount: number;
  max_discount: number;
  brand_count: number;
  price_changes_today: number;
  drops_today?: number;
  new_products_48h: number;
  days_tracked: number;
  discount_buckets?: Record<string, number>;
  high_discount_50_plus?: number;
  high_discount_60_plus?: number;
  sold_recent_24h?: number;
  sold_recent_48h?: number;
  sold_total?: number;
}

/** Contents of `public/data/meta.json`. */
export interface DashboardMeta {
  generated_at: string;
  source: string;
  stats: DashboardStats;
  brands: string[];
  scrape_history?: ScrapeRun[];
}

/** @deprecated Use `DashboardMeta`. */
export type MetaData = DashboardMeta;

/** Contents of `public/data/products.json`. */
export interface ProductsCatalogExport {
  products: Product[];
  brands: string[];
  sizes: string[];
  size_counts: Record<string, number>;
  genders: string[];
  gender_counts: Record<string, number>;
}

/** Normalized new-products payload for the dashboard page. */
export interface NewProductsData {
  products: Product[];
  window_hours: number;
  new_products_48h: number;
}

/** Contents of `public/data/new_products.json`. */
export interface NewProductsExport {
  new_products: Product[];
  window_hours?: number;
  new_products_48h?: number;
}

/** Contents of `public/data/sold_products.json`. */
export interface SoldProductsExport {
  sold_recent: SoldProduct[];
  sold_all: SoldProduct[];
  sold_recent_24h: number;
  sold_recent_48h: number;
  sold_total: number;
}

export interface BestDealsExport {
  best_deals: Product[];
}

export interface PriceChangesExport {
  price_changes: PriceChange[];
}

export interface BiggestDropsExport {
  biggest_drops: PriceDrop[];
}

export interface BrandStatsExport {
  brands: Record<string, BrandStats>;
}

export interface PriceHistoriesExport {
  histories?: Record<string, Array<[string, number, number]>>;
}

export interface ProductDetailData {
  product: Product | null;
  sold: SoldProduct | null;
  history: Array<[string, number, number]>;
}
