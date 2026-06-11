import { loadMeta } from "@/lib/data";
import { BuySignalsGrid } from "@/components/BuySignalsGrid";
import { PageShell } from "@/components/PageShell";

export default async function BuySignalsPage() {
  const meta = await loadMeta();

  return (
    <PageShell
      stats={meta.stats}
      source={meta.source}
      generatedAt={meta.generated_at}
      counts={{ buy_signals: meta.stats.buy_signals_count }}
    >
      <BuySignalsGrid />
    </PageShell>
  );
}
