import type { Product } from "./types";

const STORAGE_KEY = "gftracker-watchlist";

export interface WatchlistSnapshot {
  current_price: number;
  old_price: number;
  discount_percent: number;
  name: string;
  brand: string;
  sku: string;
  url: string;
  image_url?: string;
}

export interface WatchlistItem {
  product_id: string;
  liked_at: string;
  snapshot: WatchlistSnapshot;
}

export function snapshotFromProduct(product: Product): WatchlistSnapshot {
  return {
    current_price: product.current_price,
    old_price: product.old_price,
    discount_percent: product.discount_percent,
    name: product.name,
    brand: product.brand,
    sku: product.sku,
    url: product.url,
    image_url: product.image_url,
  };
}

export function readWatchlist(): WatchlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WatchlistItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeWatchlist(items: WatchlistItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function isLiked(productId: string, items: WatchlistItem[]): boolean {
  return items.some((item) => item.product_id === productId);
}

export function toggleWatchlistItem(
  product: Product,
  items: WatchlistItem[],
): WatchlistItem[] {
  const exists = items.some((item) => item.product_id === product.product_id);
  if (exists) {
    return items.filter((item) => item.product_id !== product.product_id);
  }
  return [
    {
      product_id: product.product_id,
      liked_at: new Date().toISOString(),
      snapshot: snapshotFromProduct(product),
    },
    ...items,
  ];
}

export function priceDelta(
  snapshot: WatchlistSnapshot,
  current: Product | undefined,
): {
  changed: boolean;
  dropped: boolean;
  amount: number;
  discountChanged: boolean;
} {
  if (!current) {
    return {
      changed: false,
      dropped: false,
      amount: 0,
      discountChanged: false,
    };
  }
  const amount = current.current_price - snapshot.current_price;
  return {
    changed:
      amount !== 0 ||
      current.discount_percent !== snapshot.discount_percent,
    dropped: amount < 0,
    amount,
    discountChanged:
      current.discount_percent !== snapshot.discount_percent,
  };
}
