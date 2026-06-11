import {
  loadBestDeals,
  loadBiggestDrops,
  loadBuySignals,
  loadCatalogCounts,
  loadMeta,
  loadSoldProducts,
} from "@/lib/data";
import { formatDate } from "@/lib/format";
import { OverviewExtras } from "@/components/OverviewExtras";
import {
  OverviewQuickLinks,
  type QuickLinkData,
} from "@/components/OverviewQuickLinks";
import { PageShell } from "@/components/PageShell";
import { StatsCards } from "@/components/StatsCards";

export default async function HomePage() {
  const [meta, drops, bestDeals, buySignals, sold, catalog] =
    await Promise.all([
      loadMeta(),
      loadBiggestDrops(),
      loadBestDeals(),
      loadBuySignals(),
      loadSoldProducts(),
      loadCatalogCounts(),
    ]);

  const quickLinks: QuickLinkData[] = [
    {
      href: "/best-deals",
      title: "Best Deals",
      desc: "Highest discounts right now",
      count: bestDeals.length,
      countLabel: "deals",
      tone: "border-amber-200/80 bg-amber-50/80",
    },
    {
      href: "/biggest-drops",
      title: "Price Drops",
      desc: "Largest QAR reductions logged",
      count: drops.length,
      countLabel: "drops",
      tone: "border-emerald-200/80 bg-emerald-50/80",
    },
    {
      href: "/buy-signals",
      title: "Buy Signals",
      desc: "At or near all-time low",
      count: buySignals.length,
      countLabel: "signals",
      tone: "border-teal-200/80 bg-teal-50/80",
    },
    {
      href: "/sold",
      title: "Sold / Gone",
      desc: "Removed from offer recently",
      count: sold.sold_recent_48h,
      countLabel: "gone (48h)",
      tone: "border-orange-200/80 bg-orange-50/80",
    },
    {
      href: "/products",
      title: "All Products",
      desc: "Full catalog with filters",
      count: meta.stats.total_products,
      countLabel: "products",
      tone: "border-slate-200/80 bg-slate-50/80",
    },
    {
      href: "/brands",
      title: "Brands",
      desc: "Browse by brand",
      count: meta.stats.brand_count || meta.brands.length,
      countLabel: "brands",
      tone: "border-slate-200/80 bg-slate-50/50",
    },
    {
      href: "/sizes",
      title: "Sizes",
      desc: "Filter by clothing & shoe size",
      count: catalog.sizeCount,
      countLabel: "sizes",
      tone: "border-slate-200/80 bg-slate-50/50",
    },
    {
      href: "/my-list",
      title: "My List",
      desc: "Your liked products & alerts",
      count: 0,
      countLabel: "saved",
      tone: "border-violet-200/80 bg-violet-50/80",
      watchlist: true,
    },
  ];

  return (
    <PageShell
      stats={meta.stats}
      source={meta.source}
      generatedAt={meta.generated_at}
      counts={{
        best_deals: bestDeals.length,
        buy_signals: buySignals.length,
        changes: drops.length,
      }}
    >
      <StatsCards
        stats={{
          ...meta.stats,
          sold_recent_24h: sold.sold_recent_24h,
        }}
        generatedAt={formatDate(meta.generated_at)}
      />

      <OverviewQuickLinks links={quickLinks} />

      <OverviewExtras meta={meta} drops={drops} />
    </PageShell>
  );
}
