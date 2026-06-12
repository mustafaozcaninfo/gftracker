import { Suspense } from "react";
import { loadMeta, loadPriceChanges } from "@/lib/data";
import { pageMetadata } from "@/lib/metadata";
import { PageShell } from "@/components/PageShell";
import { MyListTabs } from "@/components/MyListTabs";

export const metadata = pageMetadata(
  "My List",
  "Liked products and price changes tracked on this device.",
);

function MyListFallback() {
  return (
    <p className="rounded-2xl border border-black/10 bg-white p-8 text-center text-neutral-500">
      Loading…
    </p>
  );
}

export default async function MyListPage() {
  const [meta, changes] = await Promise.all([loadMeta(), loadPriceChanges()]);

  return (
    <PageShell
      stats={meta.stats}
      source={meta.source}
      generatedAt={meta.generated_at}
    >
      <Suspense fallback={<MyListFallback />}>
        <MyListTabs changes={changes} />
      </Suspense>
    </PageShell>
  );
}
