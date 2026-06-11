"use client";

import Link from "next/link";
import { useCompare } from "./CompareProvider";

export function CompareBar() {
  const { ids, ready, clear } = useCompare();
  if (!ready || ids.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3 shadow-lg sm:w-auto">
      <p className="text-sm font-medium">
        {ids.length} selected for compare
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={clear}
          className="rounded-lg px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100"
        >
          Clear
        </button>
        <Link
          href="/compare"
          className={`rounded-lg px-3 py-1.5 text-xs font-medium text-white ${
            ids.length < 2
              ? "pointer-events-none bg-neutral-400"
              : "bg-gl-black hover:bg-neutral-800"
          }`}
          aria-disabled={ids.length < 2}
        >
          Compare
        </Link>
      </div>
    </div>
  );
}
