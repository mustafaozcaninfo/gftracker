export function inferGender(name: string, brand = ""): string {
  let haystack = name;
  if (brand && name.toLowerCase().startsWith(brand.toLowerCase())) {
    haystack = name.slice(brand.length).trim();
  }

  const rules: [RegExp, string][] = [
    [/\bunisex\b/i, "unisex"],
    [/\bwomen(?:'s|s)?\b/i, "women"],
    [/\bmen(?:'s|s)?\b/i, "men"],
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
  return product.gender || inferGender(product.name, product.brand);
}
