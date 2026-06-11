"use client";

import { useCallback, useState } from "react";
import type { Product } from "@/lib/types";
import {
  decodeWatchlistShare,
  downloadTextFile,
  encodeWatchlistShare,
  exportWatchlistCsv,
} from "@/lib/watchlist";
import { useWatchlist } from "./WatchlistProvider";

interface MyListToolbarProps {
  products: Product[];
}

export function MyListToolbar({ products }: MyListToolbarProps) {
  const { items, importItems } = useWatchlist();
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const productMap = new Map(products.map((p) => [p.product_id, p]));

  const exportCsv = useCallback(() => {
    const csv = exportWatchlistCsv(items, productMap);
    const date = new Date().toISOString().slice(0, 10);
    downloadTextFile(`gftracker-my-list-${date}.csv`, csv, "text/csv;charset=utf-8");
  }, [items, productMap]);

  const shareList = useCallback(async () => {
    const encoded = encodeWatchlistShare(items);
    if (!encoded) return;
    const url = `${window.location.origin}/my-list?import=${encoded}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareStatus("Link copied to clipboard");
    } catch {
      setShareStatus("Copy this link manually");
      window.prompt("Share your list", url);
    }
    window.setTimeout(() => setShareStatus(null), 3000);
  }, [items]);

  const importFromUrl = useCallback(() => {
    const raw = window.prompt("Paste a shared My List link or import code");
    if (!raw?.trim()) return;
    const match = raw.match(/import=([^&]+)/);
    const encoded = match ? match[1] : raw.trim();
    const decoded = decodeWatchlistShare(encoded);
    if (!decoded?.length) {
      setImportStatus("Invalid share link");
      window.setTimeout(() => setImportStatus(null), 3000);
      return;
    }
    const added = importItems(decoded);
    setImportStatus(
      added > 0 ? `Added ${added} product${added === 1 ? "" : "s"}` : "Already in your list",
    );
    window.setTimeout(() => setImportStatus(null), 3000);
  }, [importItems]);

  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={exportCsv}
        className="inline-flex min-h-10 items-center rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-50"
      >
        Export CSV
      </button>
      <button
        type="button"
        onClick={shareList}
        className="inline-flex min-h-10 items-center rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-50"
      >
        Share list
      </button>
      <button
        type="button"
        onClick={importFromUrl}
        className="inline-flex min-h-10 items-center rounded-xl border border-black/10 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-50"
      >
        Import list
      </button>
      {shareStatus && (
        <span className="text-sm text-emerald-700">{shareStatus}</span>
      )}
      {importStatus && (
        <span className="text-sm text-neutral-600">{importStatus}</span>
      )}
    </div>
  );
}
