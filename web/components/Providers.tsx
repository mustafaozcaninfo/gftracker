"use client";

import type { ReactNode } from "react";
import { CompareBar } from "./CompareBar";
import { CompareProvider } from "./CompareProvider";
import { ServiceWorkerRegister } from "./ServiceWorkerRegister";
import { WatchlistProvider } from "./WatchlistProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WatchlistProvider>
      <CompareProvider>
        {children}
        <CompareBar />
        <ServiceWorkerRegister />
      </CompareProvider>
    </WatchlistProvider>
  );
}
