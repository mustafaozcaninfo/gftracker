import Image from "next/image";
import type { Product } from "@/lib/types";
import { formatQAR } from "@/lib/format";
import { LazyProductImage } from "./LazyProductImage";

interface ProductCardProps {
  product: Product;
  rank?: number;
  lazyImage?: boolean;
}

export function ProductCard({ product, rank, lazyImage = false }: ProductCardProps) {
  const saved = product.old_price - product.current_price;
  const atLowest = product.is_at_lowest;
  const nearLow =
    !atLowest &&
    product.pct_above_lowest !== undefined &&
    product.pct_above_lowest <= 2;

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3 border-b border-black/5 bg-neutral-50 px-4 py-3">
        <div className="min-w-0">
          {rank !== undefined && (
            <span className="text-xs font-medium text-neutral-400">#{rank}</span>
          )}
          <p className="truncate text-xs uppercase tracking-wide text-gl-gold">
            {product.brand}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {atLowest && (
            <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
              Buy now
            </span>
          )}
          {nearLow && (
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
              Near low
            </span>
          )}
          {product.discount_percent > 0 && (
            <span className="rounded-full bg-gl-red px-2.5 py-1 text-xs font-semibold text-white">
              {product.discount_percent}% OFF
            </span>
          )}
        </div>
      </div>

      {product.image_url ? (
        lazyImage ? (
          <LazyProductImage src={product.image_url} alt={product.name} />
        ) : (
          <div className="relative aspect-[340/450] w-full bg-neutral-100">
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-cover object-top"
              unoptimized
            />
          </div>
        )
      ) : (
        <div className="flex aspect-[340/450] items-center justify-center bg-neutral-100 text-xs text-neutral-400">
          No image
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="line-clamp-3 text-sm font-medium leading-snug text-neutral-900">
          {product.name}
        </h3>

        <div className="mt-auto space-y-1">
          <p className="font-display text-2xl text-gl-black">
            {formatQAR(product.current_price)}
          </p>
          <p className="text-sm text-neutral-400 line-through">
            {formatQAR(product.old_price)}
          </p>
          {saved > 0 && (
            <p className="text-xs text-emerald-700">
              Save {formatQAR(saved)}
            </p>
          )}
          {product.lowest_price !== undefined && (
            <p className="text-xs text-neutral-500">
              All-time low: {formatQAR(product.lowest_price)}
              {product.lowest_date && (
                <span className="text-neutral-400"> · {product.lowest_date}</span>
              )}
            </p>
          )}
          {product.days_tracked !== undefined && product.days_tracked > 0 && (
            <p className="text-[11px] text-neutral-400">
              Tracked {product.days_tracked} day{product.days_tracked === 1 ? "" : "s"}
              {product.pct_above_lowest !== undefined && product.pct_above_lowest > 0 && (
                <span> · +{product.pct_above_lowest}% above low</span>
              )}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 text-xs text-neutral-500">
          <span>SKU {product.sku}</span>
          <span>Page {product.page}</span>
        </div>

        <a
          href={product.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-xl bg-gl-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
        >
          View on site
        </a>
      </div>
    </article>
  );
}
