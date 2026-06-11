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
import {
  MAX_COMPARE,
  readCompareIds,
  toggleCompareId,
  writeCompareIds,
} from "@/lib/compare";

interface CompareContextValue {
  ids: string[];
  ready: boolean;
  isSelected: (productId: string) => boolean;
  toggle: (productId: string) => void;
  remove: (productId: string) => void;
  clear: () => void;
  max: number;
}

const CompareContext = createContext<CompareContextValue | null>(null);

export function CompareProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setIds(readCompareIds());
    setReady(true);
  }, []);

  const toggle = useCallback(
    (productId: string) => {
      setIds((prev) => {
        const next = toggleCompareId(productId, prev);
        writeCompareIds(next);
        return next;
      });
    },
    [],
  );

  const remove = useCallback((productId: string) => {
    setIds((prev) => {
      const next = prev.filter((id) => id !== productId);
      writeCompareIds(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    writeCompareIds([]);
    setIds([]);
  }, []);

  const value = useMemo(
    () => ({
      ids,
      ready,
      isSelected: (productId: string) => ids.includes(productId),
      toggle,
      remove,
      clear,
      max: MAX_COMPARE,
    }),
    [ids, ready, toggle, remove, clear],
  );

  return (
    <CompareContext.Provider value={value}>{children}</CompareContext.Provider>
  );
}

export function useCompare(): CompareContextValue {
  const ctx = useContext(CompareContext);
  if (!ctx) {
    throw new Error("useCompare must be used within CompareProvider");
  }
  return ctx;
}
