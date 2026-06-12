import Link from "next/link";
import { loadMeta } from "@/lib/data";
import { PageShell } from "@/components/PageShell";

export default async function NotFound() {
  const meta = await loadMeta();

  return (
    <PageShell
      stats={meta.stats}
      source={meta.source}
      generatedAt={meta.generated_at}
    >
      <div className="rounded-2xl border border-dashed border-black/20 bg-white p-8 text-center">
        <h1 className="font-display text-2xl">Page not found</h1>
        <p className="mt-2 text-sm text-neutral-600">
          This route does not exist on GF Tracker.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-gl-black px-5 py-2.5 text-sm font-medium text-white"
        >
          Back to overview
        </Link>
      </div>
    </PageShell>
  );
}
