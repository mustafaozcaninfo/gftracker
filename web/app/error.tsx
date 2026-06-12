"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-2xl">Something went wrong</h1>
      <p className="text-sm text-neutral-600">
        The page failed to load. You can retry or return to the overview.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-11 items-center rounded-xl bg-gl-black px-5 py-2.5 text-sm font-medium text-white"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-xl border border-black/10 px-5 py-2.5 text-sm font-medium"
        >
          Overview
        </Link>
      </div>
    </div>
  );
}
