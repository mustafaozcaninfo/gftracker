import Link from "next/link";
import { loadMeta } from "@/lib/data";
import { PageShell } from "@/components/PageShell";

export default async function ProductNotFound() {
  const meta = await loadMeta();

  return (
    <PageShell
      stats={meta.stats}
      source={meta.source}
      generatedAt={meta.generated_at}
    >
      <div className="rounded-2xl border border-dashed border-black/20 bg-white p-8 text-center">
        <p className="text-neutral-600">Product not found.</p>
        <p className="mt-2 text-sm text-neutral-500">
          It may have been removed from the offer page or the link is invalid.
        </p>
        <Link
          href="/products"
          className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-gl-black px-5 py-2.5 text-sm font-medium text-white"
        >
          Back to catalog
        </Link>
      </div>
    </PageShell>
  );
}
