import { describe, expect, it } from "vitest";
import type { Product } from "./types";
import {
  decodeWatchlistShare,
  encodeWatchlistShare,
  priceDelta,
  type WatchlistItem,
  type WatchlistSnapshot,
} from "./watchlist";

function snap(overrides: Partial<WatchlistSnapshot> = {}): WatchlistSnapshot {
  return {
    current_price: 100,
    old_price: 200,
    discount_percent: 50,
    name: "Test",
    brand: "Brand",
    sku: "SKU",
    url: "https://example.com",
    ...overrides,
  };
}

function product(overrides: Partial<Product> = {}): Product {
  return {
    product_id: "1",
    sku: "SKU",
    name: "Test",
    brand: "Brand",
    url: "https://example.com",
    current_price: 100,
    old_price: 200,
    discount_percent: 50,
    page: 1,
    ...overrides,
  };
}

describe("priceDelta", () => {
  it("detects price drops", () => {
    const delta = priceDelta(snap({ current_price: 100 }), product({ current_price: 80 }));
    expect(delta.dropped).toBe(true);
    expect(delta.priceChanged).toBe(true);
    expect(delta.amount).toBe(-20);
    expect(delta.changed).toBe(true);
  });

  it("detects price rises", () => {
    const delta = priceDelta(snap({ current_price: 100 }), product({ current_price: 120 }));
    expect(delta.dropped).toBe(false);
    expect(delta.priceChanged).toBe(true);
    expect(delta.amount).toBe(20);
  });

  it("treats discount-only as changed but not priceChanged/dropped", () => {
    const delta = priceDelta(
      snap({ current_price: 100, discount_percent: 40 }),
      product({ current_price: 100, discount_percent: 50 }),
    );
    expect(delta.priceChanged).toBe(false);
    expect(delta.dropped).toBe(false);
    expect(delta.amount).toBe(0);
    expect(delta.discountChanged).toBe(true);
    expect(delta.changed).toBe(true);
  });

  it("ignores null/non-finite current prices", () => {
    const delta = priceDelta(
      snap({ current_price: 500 }),
      product({ current_price: null as unknown as number }),
    );
    expect(delta.dropped).toBe(false);
    expect(delta.changed).toBe(false);
    expect(delta.amount).toBe(0);
  });

  it("returns no change when product is missing", () => {
    const delta = priceDelta(snap(), undefined);
    expect(delta.changed).toBe(false);
    expect(delta.dropped).toBe(false);
  });

  it("sums drop savings correctly", () => {
    const rows = [
      priceDelta(snap({ current_price: 100 }), product({ current_price: 70 })),
      priceDelta(snap({ current_price: 200 }), product({ current_price: 150 })),
      priceDelta(snap({ current_price: 50 }), product({ current_price: 50 })),
    ];
    const total = rows
      .filter((d) => d.dropped)
      .reduce((sum, d) => sum + Math.abs(d.amount), 0);
    expect(total).toBe(80);
  });
});

describe("watchlist share encoding", () => {
  it("round-trips unicode product names", () => {
    const items: WatchlistItem[] = [
      {
        product_id: "99",
        liked_at: "2026-06-01T00:00:00.000Z",
        snapshot: snap({ name: "Sisleÿa L'Integral" }),
      },
    ];
    const encoded = encodeWatchlistShare(items);
    expect(encoded.length).toBeGreaterThan(0);
    const decoded = decodeWatchlistShare(encoded);
    expect(decoded?.[0]?.snapshot.name).toBe("Sisleÿa L'Integral");
  });
});
