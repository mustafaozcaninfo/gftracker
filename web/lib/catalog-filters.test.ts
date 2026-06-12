import { describe, expect, it } from "vitest";
import { productMatchesFilters } from "./catalog-filters";
import type { Product } from "./types";

const baseProduct: Product = {
  product_id: "1",
  sku: "SKU-1",
  name: "Nike Men Running Shoe",
  brand: "Nike",
  current_price: 200,
  old_price: 400,
  discount_percent: 50,
  url: "https://example.com/1",
  timestamp: "2026-06-12",
  page: 1,
  gender: "men",
  sizes: ["42", "43"],
};

const defaultFilters = {
  search: "",
  brand: "all",
  size: "all",
  gender: "all" as const,
  maxprice: 0,
  mindisc: 0,
  sort: "discount" as const,
};

describe("productMatchesFilters", () => {
  it("matches brand filter", () => {
    expect(
      productMatchesFilters(baseProduct, { ...defaultFilters, brand: "Nike" }, ""),
    ).toBe(true);
    expect(
      productMatchesFilters(baseProduct, { ...defaultFilters, brand: "Adidas" }, ""),
    ).toBe(false);
  });

  it("matches gender via productGender", () => {
    expect(
      productMatchesFilters(baseProduct, { ...defaultFilters, gender: "men" }, ""),
    ).toBe(true);
    expect(
      productMatchesFilters(baseProduct, { ...defaultFilters, gender: "women" }, ""),
    ).toBe(false);
  });

  it("excludes women products from men filter when stored gender is wrong", () => {
    const womenProduct: Product = {
      ...baseProduct,
      product_id: "2",
      name: "Brand Women Floral Dress",
      gender: "men",
    };
    expect(
      productMatchesFilters(womenProduct, { ...defaultFilters, gender: "men" }, ""),
    ).toBe(false);
    expect(
      productMatchesFilters(womenProduct, { ...defaultFilters, gender: "women" }, ""),
    ).toBe(true);
  });

  it("matches max price and min discount", () => {
    expect(
      productMatchesFilters(baseProduct, { ...defaultFilters, maxprice: 250 }, ""),
    ).toBe(true);
    expect(
      productMatchesFilters(baseProduct, { ...defaultFilters, maxprice: 150 }, ""),
    ).toBe(false);
    expect(
      productMatchesFilters(baseProduct, { ...defaultFilters, mindisc: 40 }, ""),
    ).toBe(true);
    expect(
      productMatchesFilters(baseProduct, { ...defaultFilters, mindisc: 60 }, ""),
    ).toBe(false);
  });

  it("matches search query on name brand or sku", () => {
    expect(productMatchesFilters(baseProduct, defaultFilters, "running")).toBe(true);
    expect(productMatchesFilters(baseProduct, defaultFilters, "nike")).toBe(true);
    expect(productMatchesFilters(baseProduct, defaultFilters, "SKU-1")).toBe(true);
    expect(productMatchesFilters(baseProduct, defaultFilters, "boot")).toBe(false);
  });
});
