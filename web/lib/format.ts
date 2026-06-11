export function formatQAR(amount: number): string {
  return new Intl.NumberFormat("en-QA", {
    style: "currency",
    currency: "QAR",
    minimumFractionDigits: 2,
  }).format(amount);
}

const QATAR_TZ = "Asia/Qatar";

export function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: QATAR_TZ,
    }).format(new Date(iso));
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
    const start = new Date(startedAt);
    const startLabel = `${dateFmt.format(start)}, ${timeFmt.format(start)}`;
    if (!completedAt || completedAt === startedAt) return startLabel;

    const end = new Date(completedAt);
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
    const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
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
