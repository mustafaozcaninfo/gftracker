import {
  loadBestDeals,
  loadBiggestDrops,
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
  const [meta, drops, bestDeals, sold, catalog] = await Promise.all([
    loadMeta(),
    loadBiggestDrops(),
    loadBestDeals(),
    loadSoldProducts(),
    loadCatalogCounts(),
  ]);

  const stats = meta.stats;

  const quickLinks: QuickLinkData[] = [
    {
      href: "/best-deals",
      title: "Best Deals",
      desc: "Highest discounts on the offer page right now",
      count: bestDeals.length,
      countLabel: "top deals",
      tone: "deal",
      featured: true,
    },
    {
      href: "/biggest-drops",
      title: "Price Drops",
      desc: "Largest QAR reductions from logged changes",
      count: stats.drops_today ?? 0,
      countLabel: "today",
      tone: "drop",
      featured: true,
    },
    {
      href: "/buy-signals",
      title: "Buy Signals",
      desc: "Within 2% of tracked lowest price",
      count: stats.buy_signals_count ?? 0,
      countLabel: "signals",
      tone: "signal",
      featured: true,
    },
    {
      href: "/sold",
      title: "Sold / Gone",
      desc: "Removed from the offer recently",
      count: sold.sold_recent_48h,
      countLabel: "48h",
      tone: "gone",
    },
    {
      href: "/products",
      title: "All Products",
      desc: "Search, filter by brand, size, price",
      count: stats.total_products,
      countLabel: "items",
      tone: "browse",
    },
    {
      href: "/brands",
      title: "Brands",
      desc: "Counts and discount stats per brand",
      count: stats.brand_count || meta.brands.length,
      countLabel: "brands",
      tone: "browse",
    },
    {
      href: "/sizes",
      title: "Sizes",
      desc: "Clothing and shoe size index",
      count: catalog.sizeCount,
      countLabel: "sizes",
      tone: "browse",
    },
    {
      href: "/my-list",
      title: "My List",
      desc: "Liked products and price alerts",
      count: 0,
      countLabel: "saved",
      tone: "personal",
      watchlist: true,
    },
    {
      href: "/compare",
      title: "Compare",
      desc: "Side-by-side up to four items",
      count: 0,
      countLabel: "",
      tone: "personal",
    },
  ];

  return (
    <PageShell
      stats={meta.stats}
      source={meta.source}
      generatedAt={meta.generated_at}
      counts={{
        best_deals: bestDeals.length,
        buy_signals: stats.buy_signals_count ?? 0,
        changes: stats.drops_today ?? 0,
      }}
    >
      <div className="space-y-8 lg:space-y-10">
        <StatsCards stats={stats} generatedAt={formatDate(meta.generated_at)} />
        <OverviewQuickLinks links={quickLinks} />
        <OverviewExtras meta={meta} drops={drops} />
      </div>
    </PageShell>
  );
}
