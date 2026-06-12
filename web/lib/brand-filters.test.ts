import { describe, expect, it } from "vitest";
import { buildBrandsHref, parseBrandSort } from "./brand-filters";

describe("brand-filters", () => {
  it("parseBrandSort defaults to count", () => {
    expect(parseBrandSort(null)).toBe("count");
    expect(parseBrandSort("invalid")).toBe("count");
  });

  it("parseBrandSort accepts known keys", () => {
    expect(parseBrandSort("name_asc")).toBe("name_asc");
    expect(parseBrandSort("avg_disc")).toBe("avg_disc");
  });

  it("buildBrandsHref encodes search and sort", () => {
    expect(buildBrandsHref({ search: "gucci", sort: "name_asc" })).toBe(
      "/brands?q=gucci&sort=name_asc",
    );
    expect(buildBrandsHref({})).toBe("/brands");
  });
});
