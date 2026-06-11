import type { Product } from "./types";

export function productSearchQuery(product: Pick<Product, "brand" | "name">): string {
  return `${product.brand} ${product.name}`.trim();
}

/** Google Lens reverse image search, or image search by product title. */
export function googleVisualSearchUrl(
  product: Pick<Product, "brand" | "name" | "image_url">,
): string {
  const query = encodeURIComponent(productSearchQuery(product));

  if (product.image_url) {
    return `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(product.image_url)}`;
  }

  return `https://www.google.com/search?q=${query}&tbm=isch`;
}

/** Text + image tab on Google (title-based image search). */
export function googleImageSearchByTitleUrl(
  product: Pick<Product, "brand" | "name">,
): string {
  const query = encodeURIComponent(productSearchQuery(product));
  return `https://www.google.com/search?q=${query}&tbm=isch`;
}
