"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Product } from "@/lib/types";
import {
  type WatchlistItem,
  isLiked as checkLiked,
  mergeWatchlists,
  readWatchlist,
  toggleWatchlistItem,
  writeWatchlist,
} from "@/lib/watchlist";

interface WatchlistContextValue {
  items: WatchlistItem[];
  ready: boolean;
  isLiked: (productId: string) => boolean;
  toggle: (product: Product) => void;
  remove: (productId: string) => void;
  importItems: (incoming: WatchlistItem[]) => number;
}

const WatchlistContext = createContext<WatchlistContextValue | null>(null);

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(readWatchlist());
    setReady(true);
  }, []);

  const toggle = useCallback((product: Product) => {
    setItems((prev) => {
      const next = toggleWatchlistItem(product, prev);
      writeWatchlist(next);
      return next;
    });
  }, []);

  const remove = useCallback((productId: string) => {
    setItems((prev) => {
      const next = prev.filter((item) => item.product_id !== productId);
      writeWatchlist(next);
      return next;
    });
  }, []);

  const importItems = useCallback((incoming: WatchlistItem[]) => {
    const prev = readWatchlist();
    const next = mergeWatchlists(prev, incoming);
    const added = next.length - prev.length;
    writeWatchlist(next);
    setItems(next);
    return added;
  }, []);

  const value = useMemo(
    () => ({
      items,
      ready,
      isLiked: (productId: string) => checkLiked(productId, items),
      toggle,
      remove,
      importItems,
    }),
    [items, ready, toggle, remove, importItems],
  );

  return (
    <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>
  );
}

export function useWatchlist(): WatchlistContextValue {
  const ctx = useContext(WatchlistContext);
  if (!ctx) {
    throw new Error("useWatchlist must be used within WatchlistProvider");
  }
  return ctx;
}
