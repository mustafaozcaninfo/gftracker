import { loadMeta } from "@/lib/data";
import { pageMetadata } from "@/lib/metadata";
import { PageShell } from "@/components/PageShell";
import { SizesHub } from "@/components/SizesHub";

export const metadata = pageMetadata(
  "Sizes",
  "Find products by clothing and shoe size on the Qatar offer page.",
);

export default async function SizesPage() {
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
          <h2 className="font-display text-xl sm:text-2xl">Sizes</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Filter the catalog by size — clothing, shoes, and One Size items.
          </p>
        </div>
        <SizesHub />
      </section>
    </PageShell>
  );
}
