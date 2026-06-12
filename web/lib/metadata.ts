import type { Metadata } from "next";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "./site";

export function pageMetadata(title: string, description?: string): Metadata {
  const fullTitle = `${title} · ${SITE_NAME}`;
  const desc = description ?? SITE_DESCRIPTION;
  return {
    title: fullTitle,
    description: desc,
    openGraph: {
      title: fullTitle,
      description: desc,
      url: SITE_URL,
      siteName: SITE_NAME,
      type: "website",
    },
  };
}
