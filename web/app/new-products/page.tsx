import { loadMeta, loadNewProducts } from "@/lib/data";
import { pageMetadata } from "@/lib/metadata";
import { NewProductsGrid } from "@/components/NewProductsGrid";
import { PageShell } from "@/components/PageShell";

export const metadata = pageMetadata(
  "New Products",
  "Products newly listed on the Galeries Lafayette Qatar offer page.",
  "/new-products",
);

export default async function NewProductsPage() {
  const [meta, newData] = await Promise.all([loadMeta(), loadNewProducts()]);

  return (
    <PageShell
      stats={meta.stats}
      source={meta.source}
      generatedAt={meta.generated_at}
      counts={{ new_products: newData.new_products_48h }}
    >
      <NewProductsGrid
        products={newData.products}
        windowHours={newData.window_hours}
        count48h={newData.new_products_48h}
      />
    </PageShell>
  );
}
