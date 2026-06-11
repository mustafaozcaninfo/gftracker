import { loadMeta, loadPriceChanges } from "@/lib/data";
import { PageShell } from "@/components/PageShell";
import { PriceChanges } from "@/components/PriceChanges";

export default async function PriceChangesPage() {
  const [meta, changes] = await Promise.all([loadMeta(), loadPriceChanges()]);

  return (
    <PageShell
      stats={meta.stats}
      source={meta.source}
      generatedAt={meta.generated_at}
      counts={{ changes: changes.length }}
    >
      <PriceChanges changes={changes} />
    </PageShell>
  );
}
