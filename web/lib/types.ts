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
  timestamp: string;
  page: number;
  lowest_price?: number;
  lowest_date?: string;
  is_at_lowest?: boolean;
  pct_above_lowest?: number;
  savings_vs_peak?: number;
  days_tracked?: number;
  price_date?: string;
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

export interface DashboardStats {
  total_products: number;
  total_pages: number;
  pages_scraped: number;
  avg_discount: number;
  max_discount: number;
  brand_count: number;
  price_changes_today: number;
  buy_signals_count: number;
  days_tracked: number;
  discount_buckets?: Record<string, number>;
  high_discount_50_plus?: number;
  high_discount_60_plus?: number;
}

export interface DashboardData {
  generated_at: string;
  source: string;
  stats: DashboardStats;
  brands: string[];
  products: Product[];
  price_changes: PriceChange[];
  buy_signals: Product[];
  best_deals: Product[];
  scrape_history?: ScrapeRun[];
}
