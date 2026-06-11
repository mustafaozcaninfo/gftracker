"use client";

import type { Product } from "@/lib/types";
import {
  googleImageSearchByTitleUrl,
  googleVisualSearchUrl,
  productSearchQuery,
} from "@/lib/google-search";

function LensIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M16.5 16.5L21 21" />
      <circle cx="11" cy="11" r="3" />
    </svg>
  );
}

interface GoogleLensButtonProps {
  product: Pick<Product, "brand" | "name" | "image_url">;
}

export function GoogleLensButton({ product }: GoogleLensButtonProps) {
  const label = productSearchQuery(product);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const url = product.image_url
          ? googleVisualSearchUrl(product)
          : googleImageSearchByTitleUrl(product);
        window.open(url, "_blank", "noopener,noreferrer");
      }}
      title={`Search Google Images: ${label}`}
      aria-label={`Search Google for ${label}`}
      className="absolute bottom-2 right-2 z-10 inline-flex min-h-9 min-w-9 items-center justify-center rounded-full border border-black/10 bg-white/95 text-sm shadow-md backdrop-blur-sm transition hover:scale-105 hover:bg-white"
    >
      <LensIcon />
    </button>
  );
}
