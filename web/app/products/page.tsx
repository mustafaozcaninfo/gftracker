import { loadMeta } from "@/lib/data";
import { PageShell } from "@/components/PageShell";
import { ProductGrid } from "@/components/ProductGrid";

export default async function ProductsPage() {
  const meta = await loadMeta();

  return (
    <PageShell
      stats={meta.stats}
      source={meta.source}
      generatedAt={meta.generated_at}
      counts={{ products: meta.stats.total_products }}
    >
      <ProductGrid brands={meta.brands} />
    </PageShell>
  );
}
