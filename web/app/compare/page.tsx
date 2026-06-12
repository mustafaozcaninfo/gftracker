import { loadMeta } from "@/lib/data";
import { pageMetadata } from "@/lib/metadata";
import { PageShell } from "@/components/PageShell";
import { CompareView } from "@/components/CompareView";

export const metadata = pageMetadata(
  "Compare",
  "Side-by-side comparison of up to four liked products.",
);

export default async function ComparePage() {
  const meta = await loadMeta();

  return (
    <PageShell
      stats={meta.stats}
      source={meta.source}
      generatedAt={meta.generated_at}
      counts={{ products: meta.stats.total_products }}
    >
      <CompareView />
    </PageShell>
  );
}
