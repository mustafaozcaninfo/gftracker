export function formatQAR(amount: number): string {
  return new Intl.NumberFormat("en-QA", {
    style: "currency",
    currency: "QAR",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function savingsPercent(current: number, old: number): number {
  if (!old) return 0;
  return Math.round(((old - current) / old) * 100);
}
