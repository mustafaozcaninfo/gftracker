import Link from "next/link";
import { buildProductsHref } from "@/lib/product-filters";

interface BrandLinkProps {
  brand: string;
  className?: string;
}

export function BrandLink({ brand, className = "" }: BrandLinkProps) {
  return (
    <Link
      href={buildProductsHref({ brand })}
      className={`truncate uppercase tracking-wide text-gl-gold hover:underline ${className}`}
    >
      {brand}
    </Link>
  );
}
