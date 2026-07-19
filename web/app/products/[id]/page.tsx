import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadMeta, loadProductDetail } from "@/lib/data";
import { formatQAR } from "@/lib/format";
import { PageShell } from "@/components/PageShell";
import { ProductDetail } from "@/components/ProductDetail";

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const { product, sold } = await loadProductDetail(id);
  const item = product ?? sold;
  if (!item) {
    return { title: "Product not found" };
  }

  const title = `${item.brand} — ${item.name}`;
  const description = product
    ? `${product.discount_percent}% off · ${formatQAR(product.current_price)} on the GL Qatar offer page`
    : "No longer on the offer page — sold or delisted";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: item.image_url ? [{ url: item.image_url }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const [meta, detail] = await Promise.all([loadMeta(), loadProductDetail(id)]);

  if (!detail.product && !detail.sold) {
    notFound();
  }

  return (
    <PageShell
      stats={meta.stats}
      source={meta.source}
      generatedAt={meta.generated_at}
      counts={{ products: meta.stats.total_products }}
    >
      <ProductDetail data={detail} />
    </PageShell>
  );
}
