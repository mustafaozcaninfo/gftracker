import { loadMeta } from "@/lib/data";
import { pageMetadata } from "@/lib/metadata";
import { PageShell } from "@/components/PageShell";
import { BrandsGrid } from "@/components/BrandsGrid";

export const metadata = pageMetadata(
  "Brands",
  "Browse offer products grouped by brand with average and max discounts.",
);

export default async function BrandsPage() {
  const meta = await loadMeta();

  return (
    <PageShell
      stats={meta.stats}
      source={meta.source}
      generatedAt={meta.generated_at}
      counts={{ products: meta.stats.total_products }}
    >
      <section className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
            Browse
          </p>
          <h2 className="font-display text-xl sm:text-2xl">Brands</h2>
          <p className="mt-1 text-sm text-neutral-600">
            {meta.brands.length.toLocaleString()} brands with product counts and
            discount stats
          </p>
        </div>
        <BrandsGrid />
      </section>
    </PageShell>
  );
}
