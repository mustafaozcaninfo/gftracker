export type GenderValue = "men" | "women" | "kids" | "unisex";

const VALID_GENDERS = new Set<GenderValue>(["men", "women", "kids", "unisex"]);

export function normalizeGender(value?: string): GenderValue | "" {
  const gender = (value || "").trim().toLowerCase();
  return VALID_GENDERS.has(gender as GenderValue) ? (gender as GenderValue) : "";
}

export function inferGender(name: string, brand = ""): string {
  let haystack = name;
  if (brand && name.toLowerCase().startsWith(brand.toLowerCase())) {
    haystack = name.slice(brand.length).trim();
  }

  const rules: [RegExp, string][] = [
    [/\bunisex\b/i, "unisex"],
    [/\bwomen(?:'s|s)?\b/i, "women"],
    [/(?<![a-z])men(?:'s|s)?\b/i, "men"],
    [/\bkids?\b/i, "kids"],
    [/\bboys?\b/i, "kids"],
    [/\bgirls?\b/i, "kids"],
  ];

  for (const [pattern, gender] of rules) {
    if (pattern.test(haystack) || pattern.test(name)) return gender;
  }
  return "";
}

export function productGender(
  product: { name: string; brand: string; gender?: string },
): string {
  const inferred = inferGender(product.name, product.brand);
  const stored = normalizeGender(product.gender);
  if (inferred && stored && inferred !== stored) {
    return inferred;
  }
  return stored || inferred;
}
