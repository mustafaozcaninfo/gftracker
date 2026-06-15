import type { MetadataRoute } from "next";
import { loadProductsCatalog } from "@/lib/data";
import { SITE_URL } from "@/lib/site";

const STATIC_ROUTES = [
  "/",
  "/products",
  "/best-deals",
  "/new-products",
  "/biggest-drops",
  "/price-changes",
  "/brands",
  "/sizes",
  "/sold",
  "/compare",
  "/my-list",
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency: path === "/" ? "hourly" : "daily",
    priority: path === "/" ? 1 : 0.7,
  }));

  let productEntries: MetadataRoute.Sitemap = [];
  try {
    const catalog = await loadProductsCatalog();
    productEntries = catalog.products.map((product) => ({
      url: `${SITE_URL}/products/${encodeURIComponent(product.product_id)}`,
      lastModified,
      changeFrequency: "daily" as const,
      priority: 0.5,
    }));
  } catch {
    productEntries = [];
  }

  return [...staticEntries, ...productEntries];
}
