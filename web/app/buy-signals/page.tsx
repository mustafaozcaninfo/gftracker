import { loadBuySignals, loadMeta } from "@/lib/data";
import { pageMetadata } from "@/lib/metadata";
import { BuySignalsGrid } from "@/components/BuySignalsGrid";
import { PageShell } from "@/components/PageShell";

export const metadata = pageMetadata(
  "Buy Signals",
  "Products at or within 2% of their tracked lowest price.",
);

export default async function BuySignalsPage() {
  const [meta, signals] = await Promise.all([loadMeta(), loadBuySignals()]);

  return (
    <PageShell
      stats={meta.stats}
      source={meta.source}
      generatedAt={meta.generated_at}
      counts={{ buy_signals: meta.stats.buy_signals_count }}
    >
      <BuySignalsGrid signals={signals} />
    </PageShell>
  );
}
