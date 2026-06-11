import { formatDate } from "@/lib/format";

interface SiteFooterProps {
  source: string;
  generatedAt: string;
}

export function SiteFooter({ source, generatedAt }: SiteFooterProps) {
  return (
    <footer className="mt-10 border-t border-black/10 pt-6 text-center text-xs text-neutral-500">
      {source} · Updated {formatDate(generatedAt)}
    </footer>
  );
}
