"use client";

import Image from "next/image";
import type { Product } from "@/lib/types";
import { GoogleLensButton } from "./GoogleLensButton";
import { LazyProductImage } from "./LazyProductImage";

interface ProductImageSectionProps {
  product: Product;
  lazy?: boolean;
}

export function ProductImageSection({
  product,
  lazy = false,
}: ProductImageSectionProps) {
  if (!product.image_url) {
    return (
      <div className="relative flex aspect-[340/450] items-center justify-center bg-neutral-100 text-xs text-neutral-400">
        No image
        <GoogleLensButton product={product} />
      </div>
    );
  }

  return (
    <div className="relative">
      {lazy ? (
        <LazyProductImage src={product.image_url} alt={product.name} />
      ) : (
        <div className="relative aspect-[340/450] w-full overflow-hidden bg-neutral-100">
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover object-top"
            unoptimized
          />
        </div>
      )}
      <GoogleLensButton product={product} />
    </div>
  );
}
