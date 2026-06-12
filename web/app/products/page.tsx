import { Suspense } from "react";
import { loadMeta } from "@/lib/data";
import { pageMetadata } from "@/lib/metadata";
import { PageShell } from "@/components/PageShell";
import { ProductGrid } from "@/components/ProductGrid";

export const metadata = pageMetadata(
  "All Products",
  "Browse and filter the full offer catalog with brand, size, gender, and price filters.",
);

function ProductsGridFallback() {
  return (
    <p className="rounded-2xl border border-black/10 bg-white p-12 text-center text-neutral-500">
      Loading catalog…
    </p>
  );
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
