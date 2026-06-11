import { readFile } from "fs/promises";
import path from "path";
import type {
  DashboardStats,
  PriceChange,
  Product,
  ScrapeRun,
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
  buy_signals_count: 0,
  days_tracked: 0,
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
