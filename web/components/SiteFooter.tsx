import { formatDate } from "@/lib/format";

interface SiteFooterProps {
  source: string;
  generatedAt: string;
}

export function SiteFooter({ source, generatedAt }: SiteFooterProps) {
  return (
    <footer className="mt-8 space-y-2 border-t border-black/10 pt-5 text-center text-[11px] text-neutral-500 sm:mt-10 sm:pt-6 sm:text-xs">
      <p>
        {source} · Updated {formatDate(generatedAt)}
      </p>
      <p>
        <a href="/feed.xml" className="underline hover:text-neutral-700">
          RSS feed
        </a>
      </p>
    </footer>
  );
}
