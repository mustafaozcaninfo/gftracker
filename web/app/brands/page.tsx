import Link from "next/link";
import { loadMeta } from "@/lib/data";
import { buildProductsHref } from "@/lib/product-filters";
import { PageShell } from "@/components/PageShell";

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
          <h2 className="font-display text-xl sm:text-2xl">Markalar</h2>
          <p className="mt-1 text-sm text-neutral-600">
            {meta.brands.length.toLocaleString()} brands — tap to filter products
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {meta.brands.map((brand) => (
            <Link
              key={brand}
              href={buildProductsHref({ brand })}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-black/10 bg-white px-3 py-2.5 text-center text-sm font-medium text-neutral-800 transition hover:border-gl-gold hover:bg-neutral-50"
            >
              {brand}
            </Link>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
