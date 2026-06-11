"use client";

import type { Product } from "@/lib/types";
import { useWatchlist } from "./WatchlistProvider";

interface LikeButtonProps {
  product: Product;
  className?: string;
}

export function LikeButton({ product, className = "" }: LikeButtonProps) {
  const { isLiked, toggle, ready } = useWatchlist();
  const liked = ready && isLiked(product.product_id);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(product);
      }}
      aria-label={liked ? "Remove from liked list" : "Add to liked list"}
      aria-pressed={liked}
      className={`inline-flex min-h-9 min-w-9 items-center justify-center rounded-full border border-black/10 bg-white/90 text-base shadow-sm transition hover:scale-105 hover:bg-white ${className}`}
    >
      <span className={liked ? "text-gl-red" : "text-neutral-400"}>
        {liked ? "♥" : "♡"}
      </span>
    </button>
  );
}
