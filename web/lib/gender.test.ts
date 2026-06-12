import { describe, expect, it } from "vitest";
import { inferGender, productGender } from "./gender";

describe("inferGender", () => {
  it("does not classify women products as men", () => {
    const names = [
      "Adidas Women Hazy Copper Shoes",
      "Needle & Thread Women Lea Dress",
      "women",
      "womens",
      "women's coat",
    ];
    for (const name of names) {
      expect(inferGender(name)).toBe("women");
      expect(inferGender(name)).not.toBe("men");
    }
  });

  it("matches standalone men tokens", () => {
    expect(inferGender("Nike Men Running Shoe")).toBe("men");
    expect(inferGender("Men Shirt")).toBe("men");
    expect(inferGender("men's jacket")).toBe("men");
  });

  it("does not match men inside amen or women", () => {
    expect(inferGender("Amen bracelet")).toBe("");
    expect(inferGender("Garment bag")).toBe("");
  });
});

describe("productGender", () => {
  it("prefers name inference when stored gender conflicts", () => {
    expect(
      productGender({
        name: "Marc Jacobs Women Tote Bag",
        brand: "Marc Jacobs",
        gender: "men",
      }),
    ).toBe("women");
  });

  it("keeps stored gender when name is neutral", () => {
    expect(
      productGender({
        name: "Classic Leather Belt",
        brand: "Test",
        gender: "men",
      }),
    ).toBe("men");
  });
});
