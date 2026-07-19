import { loadBestDeals, loadBiggestDrops, loadMeta } from "@/lib/data";
import { SITE_URL } from "@/lib/site";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const [meta, bestDeals, drops] = await Promise.all([
    loadMeta(),
    loadBestDeals(),
    loadBiggestDrops(),
  ]);

  const items = [
    ...bestDeals.slice(0, 15).map((product) => ({
      title: `${product.brand} — ${product.name} (${product.discount_percent}% off)`,
      link: `${SITE_URL}/products/${product.product_id}`,
      description: `Now QAR ${product.current_price} (was ${product.old_price})`,
    })),
    ...drops.slice(0, 10).map((drop) => ({
      title: `Price drop: ${drop.name} (−QAR ${drop.drop_amount})`,
      link: `${SITE_URL}/products/${drop.product_id}`,
      description: `${drop.old_current_price} → ${drop.new_current_price} QAR`,
    })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>GF Tracker — Galeries Lafayette Qatar Deals</title>
    <link>${SITE_URL}</link>
    <description>Daily best deals and price drops from Galeries Lafayette Qatar offer page.</description>
    <lastBuildDate>${new Date(meta.generated_at).toUTCString()}</lastBuildDate>
    ${items
      .map(
        (item) => `
    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <description>${escapeXml(item.description)}</description>
      <guid isPermaLink="true">${escapeXml(item.link)}</guid>
    </item>`,
      )
      .join("")}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
