"use client";

import { useState } from "react";
import type { ScrapeRun } from "@/lib/types";
import { formatScrapeDuration, formatScrapeRunWhen } from "@/lib/format";

const INITIAL_VISIBLE = 5;

interface RecentRunsListProps {
  runs: ScrapeRun[];
}

function statusStyles(status: string): string {
  if (status === "completed") return "bg-emerald-100 text-emerald-800";
  if (status === "partial") return "bg-amber-100 text-amber-900";
  if (status === "failed") return "bg-red-100 text-red-800";
  return "bg-neutral-100 text-neutral-700";
}

export function RecentRunsList({ runs }: RecentRunsListProps) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? runs : runs.slice(0, INITIAL_VISIBLE);
  const hasMore = runs.length > INITIAL_VISIBLE;

  if (!runs.length) return null;

  return (
    <section className="flex h-full flex-col rounded-2xl border border-black/8 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-4">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-500">
          Scraper health
        </p>
        <h2 className="font-display text-xl sm:text-2xl">Recent runs</h2>
        <p className="mt-1 text-sm text-neutral-600">Hourly catalog sync (Qatar time)</p>
      </div>

      <ul className="divide-y divide-black/6">
        {visible.map((run) => {
          const duration = formatScrapeDuration(run.started_at, run.completed_at);
          return (
            <li key={run.id} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 py-3 first:pt-0 sm:grid-cols-[1fr_auto_auto] sm:items-center">
              <div className="min-w-0">
                <p className="text-sm font-medium tabular-nums text-gl-black">
                  {formatScrapeRunWhen(run.started_at, run.completed_at)}
                </p>
                {duration && (
                  <p className="text-[11px] text-neutral-500">{duration}</p>
                )}
              </div>
              <div className="col-start-2 row-start-1 shrink-0 text-right sm:row-auto">
                <p className="text-sm tabular-nums text-neutral-700">
                  {run.products_found.toLocaleString()} items
                </p>
                <p className="text-[11px] tabular-nums text-neutral-500">
                  {run.pages_scraped}/{run.total_pages || "—"} pg
                </p>
              </div>
              <span
                className={`col-span-2 w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide sm:col-span-1 sm:col-start-3 ${statusStyles(run.status)}`}
              >
                {run.status}
              </span>
            </li>
          );
        })}
      </ul>

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 w-full rounded-xl border border-black/10 bg-gl-cream py-2.5 text-sm font-medium text-gl-black transition hover:bg-neutral-200/50"
        >
          {expanded ? "Show less" : `Show more (${runs.length - INITIAL_VISIBLE} more)`}
        </button>
      )}
    </section>
  );
}
