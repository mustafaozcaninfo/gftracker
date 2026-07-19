import { loadMeta, loadPriceChanges } from "@/lib/data";
import { pageMetadata } from "@/lib/metadata";
import { PageShell } from "@/components/PageShell";
import { PriceChanges } from "@/components/PriceChanges";

export const metadata = pageMetadata(
  "Price Changes",
  "Recent logged price or discount moves from hourly scrapes (last 200).",
  "/price-changes",
);

export default async function PriceChangesPage() {
  const [meta, changes] = await Promise.all([loadMeta(), loadPriceChanges()]);

  return (
    <PageShell
      stats={meta.stats}
      source={meta.source}
      generatedAt={meta.generated_at}
    >
      <section className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
            Activity
          </p>
          <h2 className="font-display text-xl sm:text-2xl">Recent Price Changes</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Latest logged price or discount moves — drops and increases — from
            hourly scrapes (showing up to {changes.length || 200} recent entries).
          </p>
        </div>
        <PriceChanges changes={changes} hideHeader />
      </section>
    </PageShell>
  );
}
