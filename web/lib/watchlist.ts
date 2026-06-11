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
  sizes?: string[];
  is_one_size?: boolean;
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
    sizes: product.sizes,
    is_one_size: product.is_one_size,
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

export function encodeWatchlistShare(items: WatchlistItem[]): string {
  const json = JSON.stringify(items);
  if (typeof btoa === "undefined") return "";
  return btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeWatchlistShare(encoded: string): WatchlistItem[] | null {
  try {
    const padded = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
    const json = atob(padded + pad);
    const parsed = JSON.parse(json) as WatchlistItem[];
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(
      (item) =>
        item &&
        typeof item.product_id === "string" &&
        item.snapshot &&
        typeof item.snapshot.name === "string",
    );
  } catch {
    return null;
  }
}

export function mergeWatchlists(
  existing: WatchlistItem[],
  incoming: WatchlistItem[],
): WatchlistItem[] {
  const seen = new Set(existing.map((item) => item.product_id));
  const merged = [...existing];
  for (const item of incoming) {
    if (!seen.has(item.product_id)) {
      merged.push(item);
      seen.add(item.product_id);
    }
  }
  return merged;
}

export function exportWatchlistCsv(
  items: WatchlistItem[],
  currentById: Map<string, Product>,
): string {
  const escape = (value: string | number) => {
    const text = String(value);
    if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  };

  const rows = [
    [
      "product_id",
      "name",
      "brand",
      "sku",
      "liked_at",
      "liked_price",
      "current_price",
      "liked_discount",
      "current_discount",
      "price_change",
      "url",
    ].join(","),
  ];

  for (const item of items) {
    const current = currentById.get(item.product_id);
    const delta = priceDelta(item.snapshot, current);
    rows.push(
      [
        item.product_id,
        item.snapshot.name,
        item.snapshot.brand,
        item.snapshot.sku,
        item.liked_at,
        item.snapshot.current_price,
        current?.current_price ?? "",
        item.snapshot.discount_percent,
        current?.discount_percent ?? "",
        delta.changed ? delta.amount : 0,
        item.snapshot.url,
      ]
        .map(escape)
        .join(","),
    );
  }

  return rows.join("\n");
}

export function downloadTextFile(
  filename: string,
  content: string,
  mime = "text/plain;charset=utf-8",
): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
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
