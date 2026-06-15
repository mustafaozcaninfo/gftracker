import { Suspense } from "react";
import { loadBrandStats, loadMeta } from "@/lib/data";
import { pageMetadata } from "@/lib/metadata";
import { PageShell } from "@/components/PageShell";
import { BrandsGrid } from "@/components/BrandsGrid";

export const metadata = pageMetadata(
  "Brands",
  "Browse offer products grouped by brand with average and max discounts.",
  "/brands",
);

export default async function BrandsPage() {
  const [meta, brandStats] = await Promise.all([loadMeta(), loadBrandStats()]);
  const brandCount = Object.keys(brandStats).length || meta.brands.length;

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
            {brandCount.toLocaleString()} brands with product counts and discount
            stats
          </p>
        </div>
        <Suspense
          fallback={
            <p className="rounded-2xl border border-black/10 bg-white p-8 text-center text-neutral-500">
              Loading brands…
            </p>
          }
        >
          <BrandsGrid />
        </Suspense>
      </section>
    </PageShell>
  );
}
