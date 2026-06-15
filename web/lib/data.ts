import { readFile } from "fs/promises";
import path from "path";
import { resolveProductDetail } from "./product-detail";
import type {
  BestDealsExport,
  BiggestDropsExport,
  BrandStats,
  BrandStatsExport,
  DashboardMeta,
  NewProductsData,
  NewProductsExport,
  PriceChange,
  PriceChangesExport,
  PriceDrop,
  PriceHistoriesExport,
  Product,
  ProductDetailData,
  ProductsCatalogExport,
  SoldProductsExport,
} from "./types";

export type {
  DashboardMeta,
  MetaData,
  NewProductsData,
  ProductDetailData,
  ProductsCatalogExport,
  SoldProductsExport,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "public", "data");

async function readJson<T>(filename: string): Promise<T> {
  const raw = await readFile(path.join(DATA_DIR, filename), "utf-8");
  return JSON.parse(raw) as T;
}

const emptyStats: DashboardMeta["stats"] = {
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

const emptyCatalog: ProductsCatalogExport = {
  products: [],
  brands: [],
  sizes: [],
  size_counts: {},
  genders: [],
  gender_counts: {},
};

export async function loadMeta(): Promise<DashboardMeta> {
  try {
    return await readJson<DashboardMeta>("meta.json");
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
    const data = await readJson<BestDealsExport>("best_deals.json");
    return data.best_deals ?? [];
  } catch {
    return [];
  }
}

export async function loadNewProducts(): Promise<NewProductsData> {
  try {
    const data = await readJson<NewProductsExport>("new_products.json");
    return {
      products: data.new_products ?? [],
      window_hours: data.window_hours ?? 168,
      new_products_48h: data.new_products_48h ?? 0,
    };
  } catch {
    return { products: [], window_hours: 168, new_products_48h: 0 };
  }
}

export async function loadProductsCatalog(): Promise<ProductsCatalogExport> {
  try {
    const data = await readJson<Partial<ProductsCatalogExport>>("products.json");
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
    const historyData = await readJson<PriceHistoriesExport>("price_histories.json");
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
    const data = await readJson<Pick<ProductsCatalogExport, "sizes" | "genders">>(
      "products.json",
    );
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
    const data = await readJson<BiggestDropsExport>("biggest_drops.json");
    return data.biggest_drops;
  } catch {
    return [];
  }
}

export async function loadSoldProducts(): Promise<SoldProductsExport> {
  try {
    return await readJson<SoldProductsExport>("sold_products.json");
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
    const data = await readJson<PriceChangesExport>("price_changes.json");
    return data.price_changes;
  } catch {
    return [];
  }
}

export async function loadBrandStats(): Promise<Record<string, BrandStats>> {
  try {
    const data = await readJson<BrandStatsExport>("brand_stats.json");
    return data.brands ?? {};
  } catch {
    return {};
  }
}
