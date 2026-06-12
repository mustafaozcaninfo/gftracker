import type { Product, SoldProduct } from "./types";

export interface ProductDetailResolution {
  product: Product | null;
  sold: SoldProduct | null;
}

export function resolveProductDetail(
  productId: string,
  products: Product[],
  soldRecent: SoldProduct[],
  soldAll: SoldProduct[],
): ProductDetailResolution {
  const product = products.find((p) => p.product_id === productId) ?? null;
  if (product) {
    return { product, sold: null };
  }
  const sold =
    [...soldRecent, ...soldAll].find((p) => p.product_id === productId) ?? null;
  return { product: null, sold };
}
