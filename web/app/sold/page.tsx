import { loadMeta, loadSoldProducts } from "@/lib/data";
import { PageShell } from "@/components/PageShell";
import { SoldList } from "@/components/SoldList";

export default async function SoldPage() {
  const [meta, sold] = await Promise.all([loadMeta(), loadSoldProducts()]);

  return (
    <PageShell
      stats={meta.stats}
      source={meta.source}
      generatedAt={meta.generated_at}
      counts={{ changes: sold.sold_recent_24h }}
    >
      <section className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
            Inventory
          </p>
          <h2 className="font-display text-xl sm:text-2xl">Sold / Gone</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Products that disappeared from the offer page — likely sold out or
            delisted. Updated every hour.
          </p>
        </div>
        <SoldList
          soldRecent={sold.sold_recent}
          soldAll={sold.sold_all}
          soldRecent48h={sold.sold_recent_48h}
          soldTotal={sold.sold_total}
        />
      </section>
    </PageShell>
  );
}
