import { Suspense } from "react";
import { loadMeta } from "@/lib/data";
import { pageMetadata } from "@/lib/metadata";
import { PageShell } from "@/components/PageShell";
import { ProductGrid } from "@/components/ProductGrid";

export const metadata = pageMetadata(
  "All Products",
  "Browse and filter the full offer catalog with brand, size, gender, and price filters.",
  "/products",
);

function ProductsGridFallback() {
  return null;
}

export default async function ProductsPage() {
  const meta = await loadMeta();

  return (
    <PageShell
      stats={meta.stats}
      source={meta.source}
      generatedAt={meta.generated_at}
      counts={{ products: meta.stats.total_products }}
    >
      <Suspense fallback={<ProductsGridFallback />}>
        <ProductGrid />
      </Suspense>
    </PageShell>
  );
}
