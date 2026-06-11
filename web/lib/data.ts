import { readFile } from "fs/promises";
import path from "path";
import type {
  BrandStats,
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
  buy_signals_count: 0,
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

export async function loadBuySignals(): Promise<Product[]> {
  try {
    const data = await readJson<{ buy_signals: Product[] }>("buy_signals.json");
    return data.buy_signals;
  } catch {
    return [];
  }
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

export async function loadBrandStats(): Promise<Record<string, BrandStats>> {
  try {
    const data = await readJson<{ brands: Record<string, BrandStats> }>(
      "brand_stats.json",
    );
    return data.brands;
  } catch {
    return {};
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
