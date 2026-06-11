import Link from "next/link";
import { loadMeta } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { PageShell } from "@/components/PageShell";
import { StatsCards } from "@/components/StatsCards";

export default async function HomePage() {
  const meta = await loadMeta();

  const quickLinks = [
    {
      href: "/best-deals",
      title: "Best Deals",
      desc: "Top 20 discounts today",
      count: 20,
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
      href: "/price-changes",
      title: "Price Changes",
      desc: "Recent price movements",
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

      <section className="grid gap-4 sm:grid-cols-2">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-xs uppercase tracking-wide text-gl-gold">
              {link.count.toLocaleString()} items
            </p>
            <h2 className="mt-1 font-display text-xl">{link.title}</h2>
            <p className="mt-1 text-sm text-neutral-500">{link.desc}</p>
          </Link>
        ))}
      </section>
    </PageShell>
  );
}
