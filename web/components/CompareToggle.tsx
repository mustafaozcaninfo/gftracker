"use client";

import { useCompare } from "./CompareProvider";

interface CompareToggleProps {
  productId: string;
}

export function CompareToggle({ productId }: CompareToggleProps) {
  const { isSelected, toggle, ready, max, ids } = useCompare();
  if (!ready) return null;

  const selected = isSelected(productId);
  const full = !selected && ids.length >= max;

  return (
    <button
      type="button"
      onClick={() => toggle(productId)}
      title={full ? `Compare up to ${max} products` : "Add to compare"}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition ${
        selected
          ? "bg-sky-700 text-white"
          : "bg-white text-neutral-600 ring-1 ring-black/10 hover:bg-neutral-50"
      }`}
      aria-pressed={selected}
      aria-label={selected ? "Remove from compare" : "Add to compare"}
    >
      ⇄
    </button>
  );
}
