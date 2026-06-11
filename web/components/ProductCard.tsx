import type { Product } from "@/lib/types";
import { formatQAR } from "@/lib/format";
import { BrandLink } from "./BrandLink";
import { LikeButton } from "./LikeButton";
import { ProductImageSection } from "./ProductImageSection";

interface ProductCardProps {
  product: Product;
  rank?: number;
  lazyImage?: boolean;
  showLike?: boolean;
}

export function ProductCard({
  product,
  rank,
  lazyImage = false,
  showLike = true,
}: ProductCardProps) {
  const saved = product.old_price - product.current_price;
  const atLowest = product.is_at_lowest;
  const nearLow =
    !atLowest &&
    product.pct_above_lowest !== undefined &&
    product.pct_above_lowest <= 2;

  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-2 border-b border-black/5 bg-neutral-50 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
        <div className="min-w-0">
          {rank !== undefined && (
            <span className="text-xs font-medium text-neutral-400">#{rank}</span>
          )}
          <BrandLink
            brand={product.brand}
            className="block text-[10px] sm:text-xs"
          />
        </div>
        <div className="flex shrink-0 items-start gap-2">
          {showLike && <LikeButton product={product} />}
          <div className="flex flex-col items-end gap-1">
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
            <span className="rounded-full bg-gl-red px-2 py-0.5 text-[10px] font-semibold text-white sm:px-2.5 sm:py-1 sm:text-xs">
              {product.discount_percent}% OFF
            </span>
          )}
          </div>
        </div>
      </div>

      <ProductImageSection product={product} lazy={lazyImage} />

      <div className="flex flex-1 flex-col gap-2.5 p-3 sm:gap-3 sm:p-4">
        <h3 className="line-clamp-3 text-sm font-medium leading-snug text-neutral-900 sm:text-[15px]">
          {product.name}
        </h3>

        <div className="mt-auto space-y-0.5 sm:space-y-1">
          <p className="font-display text-xl text-gl-black sm:text-2xl">
            {formatQAR(product.current_price)}
          </p>
          <p className="text-xs text-neutral-400 line-through sm:text-sm">
            {formatQAR(product.old_price)}
          </p>
          {saved > 0 && (
            <p className="text-[11px] text-emerald-700 sm:text-xs">
              Save {formatQAR(saved)}
            </p>
          )}
          {product.lowest_price !== undefined && (
            <p className="text-[11px] text-neutral-500 sm:text-xs">
              All-time low: {formatQAR(product.lowest_price)}
              {product.lowest_date && (
                <span className="text-neutral-400"> · {product.lowest_date}</span>
              )}
            </p>
          )}
          {product.days_tracked !== undefined && product.days_tracked > 0 && (
            <p className="text-[10px] text-neutral-400 sm:text-[11px]">
              Tracked {product.days_tracked} day{product.days_tracked === 1 ? "" : "s"}
              {product.pct_above_lowest !== undefined && product.pct_above_lowest > 0 && (
                <span> · +{product.pct_above_lowest}% above low</span>
              )}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 pt-1 text-[10px] text-neutral-500 sm:pt-2 sm:text-xs">
          <span className="truncate">SKU {product.sku}</span>
          <span className="shrink-0">Page {product.page}</span>
        </div>

        <a
          href={product.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-gl-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 sm:w-auto"
        >
          View on site
        </a>
      </div>
    </article>
  );
}
