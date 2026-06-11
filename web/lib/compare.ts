const STORAGE_KEY = "gftracker-compare";
export const MAX_COMPARE = 4;

export function readCompareIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_COMPARE) : [];
  } catch {
    return [];
  }
}

export function writeCompareIds(ids: string[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(0, MAX_COMPARE)));
}

export function toggleCompareId(productId: string, current: string[]): string[] {
  if (current.includes(productId)) {
    return current.filter((id) => id !== productId);
  }
  if (current.length >= MAX_COMPARE) {
    return [...current.slice(1), productId];
  }
  return [...current, productId];
}
