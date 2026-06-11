import Link from "next/link";
import { loadBiggestDrops, loadMeta } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { OverviewExtras } from "@/components/OverviewExtras";
import { PageShell } from "@/components/PageShell";
import { StatsCards } from "@/components/StatsCards";

export default async function HomePage() {
  const [meta, drops] = await Promise.all([loadMeta(), loadBiggestDrops()]);

  const quickLinks = [
    {
      href: "/best-deals",
      title: "Best Deals",
      desc: "Top 20 discounts today",
      count: 20,
    },
    {
      href: "/biggest-drops",
      title: "Price Drops",
      desc: "Biggest QAR reductions",
      count: meta.stats.price_changes_today,
    },
    {
      href: "/sold",
      title: "Sold / Gone",
      desc: "Removed from offer (last 48h)",
      count: meta.stats.sold_recent_48h ?? 0,
    },
    {
      href: "/buy-signals",
      title: "Buy Signals",
      desc: "At or near all-time low",
      count: meta.stats.buy_signals_count,
    },
    {
      href: "/products",
      title: "All Products",
      desc: "Full catalog with filters",
      count: meta.stats.total_products,
    },
    {
      href: "/brands",
      title: "Brands",
      desc: "Browse by brand",
      count: meta.brands.length,
    },
    {
      href: "/sizes",
      title: "Sizes",
      desc: "Filter by clothing & shoe size",
      count: meta.stats.total_products,
    },
    {
      href: "/my-list",
      title: "My List",
      desc: "Liked products & price changes",
      count: meta.stats.price_changes_today,
    },
  ];

  return (
    <PageShell
      stats={meta.stats}
      source={meta.source}
      generatedAt={meta.generated_at}
    >
      <StatsCards
        stats={meta.stats}
        generatedAt={formatDate(meta.generated_at)}
      />

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="min-h-[88px] rounded-2xl border border-black/10 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:min-h-0 sm:p-6"
          >
            <p className="text-[10px] uppercase tracking-wide text-gl-gold sm:text-xs">
              {link.count.toLocaleString()} items
            </p>
            <h2 className="mt-1 font-display text-base sm:text-xl">{link.title}</h2>
            <p className="mt-1 text-xs text-neutral-500 sm:text-sm">{link.desc}</p>
          </Link>
        ))}
      </section>

      <OverviewExtras meta={meta} drops={drops} />
    </PageShell>
  );
}
