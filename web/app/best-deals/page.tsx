import { loadBestDeals, loadMeta } from "@/lib/data";
import { pageMetadata } from "@/lib/metadata";
import { PageShell } from "@/components/PageShell";
import { ProductCard } from "@/components/ProductCard";

export const metadata = pageMetadata(
  "Best Deals",
  "Highest discount percentages on the Galeries Lafayette Qatar offer page.",
);

export default async function BestDealsPage() {
  const [meta, deals] = await Promise.all([loadMeta(), loadBestDeals()]);

  return (
    <PageShell
      stats={meta.stats}
      source={meta.source}
      generatedAt={meta.generated_at}
      counts={{ best_deals: deals.length }}
    >
      <section className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
            Top picks
          </p>
          <h2 className="font-display text-xl sm:text-2xl">Today&apos;s Best Discounts</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {deals.map((product, index) => (
            <ProductCard
              key={product.product_id}
              product={product}
              rank={index + 1}
            />
          ))}
        </div>
      </section>
    </PageShell>
  );
}
