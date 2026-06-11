import { Suspense } from "react";
import { loadMeta } from "@/lib/data";
import { PageShell } from "@/components/PageShell";
import { ProductDetail } from "@/components/ProductDetail";

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const meta = await loadMeta();

  return (
    <PageShell
      stats={meta.stats}
      source={meta.source}
      generatedAt={meta.generated_at}
      counts={{ products: meta.stats.total_products }}
    >
      <Suspense
        fallback={
          <p className="rounded-2xl border border-black/10 bg-white p-12 text-center text-neutral-500">
            Loading…
          </p>
        }
      >
        <ProductDetail productId={id} />
      </Suspense>
    </PageShell>
  );
}
