import type { Metadata } from "next";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "./site";

export function pageMetadata(
  title: string,
  description?: string,
  path?: string,
): Metadata {
  // Bare title — root layout template appends ` · GF Tracker`.
  const fullTitle = `${title} · ${SITE_NAME}`;
  const desc = description ?? SITE_DESCRIPTION;
  const url = path ? `${SITE_URL}${path}` : SITE_URL;
  return {
    title,
    description: desc,
    openGraph: {
      title: fullTitle,
      description: desc,
      url,
      siteName: SITE_NAME,
      type: "website",
    },
  };
}
