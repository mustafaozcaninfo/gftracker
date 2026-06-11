import { loadBiggestDrops, loadMeta } from "@/lib/data";
import { PageShell } from "@/components/PageShell";
import { BiggestDropsList } from "@/components/BiggestDropsList";

export default async function BiggestDropsPage() {
  const [meta, drops] = await Promise.all([loadMeta(), loadBiggestDrops()]);

  return (
    <PageShell
      stats={meta.stats}
      source={meta.source}
      generatedAt={meta.generated_at}
      counts={{ changes: drops.length }}
    >
      <section className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
            Deals
          </p>
          <h2 className="font-display text-xl sm:text-2xl">Biggest Price Drops</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Largest QAR reductions from recorded price changes.
          </p>
        </div>
        <BiggestDropsList drops={drops} />
      </section>
    </PageShell>
  );
}
