import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

const ROUTES = [
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
  "/feed.xml",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return ROUTES.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency: path === "/" ? "hourly" : "daily",
    priority: path === "/" ? 1 : 0.7,
  }));
}
