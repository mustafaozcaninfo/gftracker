import Link from "next/link";

export default function Loading() {
  return (
    <div className="min-h-screen bg-gl-cream">
      <header className="border-b border-black/8 bg-gl-cream/92 px-6 py-4">
        <Link href="/" className="font-display text-xl hover:opacity-80">
          GF Tracker
        </Link>
      </header>
      <div className="mx-auto max-w-7xl px-6 py-16">
        <p className="rounded-2xl border border-black/10 bg-white p-12 text-center text-neutral-500">
          Loading…
        </p>
      </div>
    </div>
  );
}
