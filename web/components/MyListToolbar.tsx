"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import type { Product } from "@/lib/types";
import {
  decodeWatchlistShare,
  downloadTextFile,
  encodeWatchlistShare,
  exportWatchlistCsv,
} from "@/lib/watchlist";
import { useCompare } from "./CompareProvider";
import { useWatchlist } from "./WatchlistProvider";

interface MyListToolbarProps {
  products: Product[];
}

export function MyListToolbar({ products }: MyListToolbarProps) {
  const { items, importItems } = useWatchlist();
  const { ids } = useCompare();
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");

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
      setShareStatus("Link copied");
    } catch {
      setShareStatus("Copy failed — use Share on mobile");
    }
    window.setTimeout(() => setShareStatus(null), 3000);
  }, [items]);

  const runImport = useCallback(() => {
    const raw = importText.trim();
    if (!raw) return;
    const match = raw.match(/import=([^&]+)/);
    const encoded = match ? match[1] : raw;
    const decoded = decodeWatchlistShare(encoded);
    if (!decoded?.length) {
      setImportStatus("Invalid link or code");
      window.setTimeout(() => setImportStatus(null), 3000);
      return;
    }
    const added = importItems(decoded);
    setImportStatus(
      added > 0 ? `Added ${added} item${added === 1 ? "" : "s"}` : "Already in list",
    );
    setImportText("");
    setShowImport(false);
    window.setTimeout(() => setImportStatus(null), 3000);
  }, [importItems, importText]);

  return (
    <div className="rounded-2xl border border-black/8 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        {items.length > 0 && (
          <>
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex min-h-10 items-center rounded-xl border border-black/10 px-4 py-2 text-sm font-medium hover:bg-neutral-50"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={shareList}
              className="inline-flex min-h-10 items-center rounded-xl border border-black/10 px-4 py-2 text-sm font-medium hover:bg-neutral-50"
            >
              Share
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => setShowImport((v) => !v)}
          className="inline-flex min-h-10 items-center rounded-xl border border-black/10 px-4 py-2 text-sm font-medium hover:bg-neutral-50"
        >
          Import
        </button>
        {ids.length >= 2 && (
          <Link
            href="/compare"
            className="inline-flex min-h-10 items-center rounded-xl bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800"
          >
            Compare ({ids.length})
          </Link>
        )}
        {shareStatus && (
          <span className="text-sm text-emerald-700">{shareStatus}</span>
        )}
        {importStatus && (
          <span className="text-sm text-neutral-600">{importStatus}</span>
        )}
      </div>

      {showImport && (
        <div className="mt-3 space-y-2 border-t border-black/6 pt-3">
          <label htmlFor="import-list" className="block text-sm text-neutral-600">
            Paste a shared My List link or import code
          </label>
          <textarea
            id="import-list"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={2}
            placeholder="https://gftracker.vercel.app/my-list?import=…"
            className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none ring-gl-gold focus:ring-2"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={runImport}
              className="inline-flex min-h-10 items-center rounded-xl bg-gl-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Import list
            </button>
            <button
              type="button"
              onClick={() => setShowImport(false)}
              className="inline-flex min-h-10 items-center rounded-xl px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
