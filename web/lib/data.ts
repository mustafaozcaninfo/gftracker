import { readFile } from "fs/promises";
import path from "path";
import { resolveProductDetail } from "./product-detail";
import type {
  DashboardStats,
  PriceChange,
  PriceDrop,
  Product,
  ScrapeRun,
  SoldProduct,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "public", "data");

async function readJson<T>(filename: string): Promise<T> {
  const raw = await readFile(path.join(DATA_DIR, filename), "utf-8");
  return JSON.parse(raw) as T;
}

export interface MetaData {
  generated_at: string;
  source: string;
  stats: DashboardStats;
  brands: string[];
  scrape_history?: ScrapeRun[];
}

const emptyStats: DashboardStats = {
  total_products: 0,
  total_pages: 0,
  pages_scraped: 0,
  avg_discount: 0,
  max_discount: 0,
  brand_count: 0,
  price_changes_today: 0,
  drops_today: 0,
  new_products_48h: 0,
  days_tracked: 0,
  sold_recent_24h: 0,
  sold_recent_48h: 0,
  sold_total: 0,
};

export async function loadMeta(): Promise<MetaData> {
  try {
    return await readJson<MetaData>("meta.json");
  } catch {
    return {
      generated_at: new Date().toISOString(),
      source: "Galeries Lafayette Qatar",
      stats: emptyStats,
      brands: [],
    };
  }
}

export async function loadBestDeals(): Promise<Product[]> {
  try {
    const data = await readJson<{ best_deals: Product[] }>("best_deals.json");
    return data.best_deals;
  } catch {
    return [];
  }
}

export interface NewProductsData {
  products: Product[];
  window_hours: number;
  new_products_48h: number;
}

export async function loadNewProducts(): Promise<NewProductsData> {
  try {
    const data = await readJson<{
      new_products: Product[];
      window_hours?: number;
      new_products_48h?: number;
    }>("new_products.json");
    return {
      products: data.new_products ?? [],
      window_hours: data.window_hours ?? 168,
      new_products_48h: data.new_products_48h ?? 0,
    };
  } catch {
    return { products: [], window_hours: 168, new_products_48h: 0 };
  }
}

export interface ProductsCatalogData {
  products: Product[];
  brands: string[];
  sizes: string[];
  size_counts: Record<string, number>;
  genders: string[];
  gender_counts: Record<string, number>;
}

const emptyCatalog: ProductsCatalogData = {
  products: [],
  brands: [],
  sizes: [],
  size_counts: {},
  genders: [],
  gender_counts: {},
};

export async function loadProductsCatalog(): Promise<ProductsCatalogData> {
  try {
    const data = await readJson<
      Partial<ProductsCatalogData> & { products?: Product[] }
    >("products.json");
    return {
      products: data.products ?? [],
      brands: data.brands ?? [],
      sizes: data.sizes ?? [],
      size_counts: data.size_counts ?? {},
      genders: data.genders ?? [],
      gender_counts: data.gender_counts ?? {},
    };
  } catch {
    return emptyCatalog;
  }
}

export interface ProductDetailData {
  product: Product | null;
  sold: SoldProduct | null;
  history: Array<[string, number, number]>;
}

export async function loadProductDetail(productId: string): Promise<ProductDetailData> {
  const [catalog, soldData] = await Promise.all([
    loadProductsCatalog(),
    loadSoldProducts(),
  ]);
  const { product, sold } = resolveProductDetail(
    productId,
    catalog.products,
    soldData.sold_recent,
    soldData.sold_all,
  );

  let history: Array<[string, number, number]> = [];
  try {
    const historyData = await readJson<{
      histories?: Record<string, Array<[string, number, number]>>;
    }>("price_histories.json");
    history = historyData.histories?.[productId] ?? [];
  } catch {
    history = [];
  }

  return { product, sold, history };
}

export async function loadCatalogCounts(): Promise<{
  sizeCount: number;
  genderCount: number;
}> {
  try {
    const data = await readJson<{
      sizes?: string[];
      genders?: string[];
    }>("products.json");
    return {
      sizeCount: data.sizes?.length ?? 0,
      genderCount: data.genders?.length ?? 0,
    };
  } catch {
    return { sizeCount: 0, genderCount: 0 };
  }
}

export async function loadBiggestDrops(): Promise<PriceDrop[]> {
  try {
    const data = await readJson<{ biggest_drops: PriceDrop[] }>("biggest_drops.json");
    return data.biggest_drops;
  } catch {
    return [];
  }
}

export interface SoldProductsData {
  sold_recent: SoldProduct[];
  sold_all: SoldProduct[];
  sold_recent_24h: number;
  sold_recent_48h: number;
  sold_total: number;
}

export async function loadSoldProducts(): Promise<SoldProductsData> {
  try {
    return await readJson<SoldProductsData>("sold_products.json");
  } catch {
    return {
      sold_recent: [],
      sold_all: [],
      sold_recent_24h: 0,
      sold_recent_48h: 0,
      sold_total: 0,
    };
  }
}

export async function loadPriceChanges(): Promise<PriceChange[]> {
  try {
    const data = await readJson<{ price_changes: PriceChange[] }>(
      "price_changes.json",
    );
    return data.price_changes;
  } catch {
    return [];
  }
}
