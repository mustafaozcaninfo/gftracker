import { describe, expect, it } from "vitest";
import { resolveProductDetail } from "./product-detail";
import type { Product, SoldProduct } from "./types";

const active: Product = {
  product_id: "100",
  sku: "SKU-100",
  name: "Active Shoe",
  brand: "BrandA",
  current_price: 100,
  old_price: 200,
  discount_percent: 50,
  url: "https://example.com/100",
  timestamp: "2026-06-01",
  page: 1,
};

const soldRecent: SoldProduct = {
  product_id: "200",
  sku: "SKU-200",
  name: "Gone Bag",
  brand: "BrandB",
  url: "https://example.com/200",
  last_seen_at: "2026-06-10",
  removed_at: "2026-06-11",
  last_price: 80,
};

const soldAll: SoldProduct = {
  product_id: "300",
  sku: "SKU-300",
  name: "Older Gone",
  brand: "BrandC",
  url: "https://example.com/300",
  last_seen_at: "2026-05-01",
};

describe("resolveProductDetail", () => {
  it("returns active product when id is in catalog", () => {
    const result = resolveProductDetail("100", [active], [soldRecent], [soldAll]);
    expect(result.product).toEqual(active);
    expect(result.sold).toBeNull();
  });

  it("falls back to sold_recent when id is missing from catalog", () => {
    const result = resolveProductDetail("200", [active], [soldRecent], [soldAll]);
    expect(result.product).toBeNull();
    expect(result.sold).toEqual(soldRecent);
  });

  it("falls back to sold_all when only listed there", () => {
    const result = resolveProductDetail("300", [active], [], [soldAll]);
    expect(result.product).toBeNull();
    expect(result.sold).toEqual(soldAll);
  });

  it("returns nulls when id is unknown", () => {
    const result = resolveProductDetail("999", [active], [soldRecent], [soldAll]);
    expect(result.product).toBeNull();
    expect(result.sold).toBeNull();
  });

  it("prefers catalog over sold lists when both contain the id", () => {
    const ghost: SoldProduct = {
      ...soldRecent,
      product_id: "100",
      name: "Stale sold row",
    };
    const result = resolveProductDetail("100", [active], [ghost], []);
    expect(result.product).toEqual(active);
    expect(result.sold).toBeNull();
  });
});
