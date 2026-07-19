export function formatQAR(amount: number): string {
  return new Intl.NumberFormat("en-QA", {
    style: "currency",
    currency: "QAR",
    minimumFractionDigits: 2,
  }).format(amount);
}

const QATAR_TZ = "Asia/Qatar";
const QATAR_OFFSET = "+03:00";

/**
 * Scrape timestamps are Qatar-local and often naive (no offset).
 * Treat naive values as Asia/Qatar so UTC hosts (e.g. Vercel) don't shift them.
 */
export function parseQatarInstant(iso: string): Date {
  const trimmed = iso.trim();
  if (!trimmed) return new Date(NaN);
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(trimmed)) {
    return new Date(trimmed);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T00:00:00${QATAR_OFFSET}`);
  }
  return new Date(`${trimmed}${QATAR_OFFSET}`);
}

export function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: QATAR_TZ,
    }).format(parseQatarInstant(iso));
  } catch {
    return iso;
  }
}

export function formatScrapeRunWhen(
  startedAt: string,
  completedAt: string | null,
): string {
  try {
    const dateFmt = new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      timeZone: QATAR_TZ,
    });
    const timeFmt = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: QATAR_TZ,
    });
    const start = parseQatarInstant(startedAt);
    const startLabel = `${dateFmt.format(start)}, ${timeFmt.format(start)}`;
    if (!completedAt || completedAt === startedAt) return startLabel;

    const end = parseQatarInstant(completedAt);
    if (dateFmt.format(start) === dateFmt.format(end)) {
      return `${startLabel} → ${timeFmt.format(end)}`;
    }
    return `${startLabel} → ${dateFmt.format(end)}, ${timeFmt.format(end)}`;
  } catch {
    return startedAt;
  }
}

export function formatScrapeDuration(
  startedAt: string,
  completedAt: string | null,
): string | null {
  if (!completedAt) return null;
  try {
    const ms =
      parseQatarInstant(completedAt).getTime() -
      parseQatarInstant(startedAt).getTime();
    if (ms < 1000) return null;
    const mins = Math.round(ms / 60_000);
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  } catch {
    return null;
  }
}

export function savingsPercent(current: number, old: number): number {
  if (!old) return 0;
  return Math.round(((old - current) / old) * 100);
}
