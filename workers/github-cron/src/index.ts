interface Env {
  GITHUB_PAT: string;
  CRON_SECRET?: string;
  SCRAPE_PAUSED?: string;
}

function isScrapePaused(env: Env): boolean {
  const v = env.SCRAPE_PAUSED?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

const REPO = "mustafaozcaninfo/gftracker";
const WORKFLOW_FILE = "daily-tracker.yml";
const OFFER_URL = "https://www.galerieslafayette.qa/offer.html?is_scroll=1&p=1";
/** While offer is 404/410, only dispatch GitHub once per day at this UTC hour (cron :15). */
const DAILY_CHECK_UTC_HOUR = 6; // 09:15 Qatar (UTC+3)

async function probeOfferStatus(): Promise<number> {
  try {
    const response = await fetch(OFFER_URL, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": "gftracker-cloudflare-cron",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    return response.status;
  } catch (err) {
    console.error("Offer probe failed:", err);
    // Network blip — still allow scrape attempt so Python can retry.
    return 0;
  }
}

async function triggerScrape(env: Env): Promise<Response> {
  const response = await fetch(
    `https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.GITHUB_PAT}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        "User-Agent": "gftracker-cloudflare-cron",
      },
      body: JSON.stringify({ ref: "main" }),
    },
  );

  const body = await response.text();
  if (!response.ok) {
    return new Response(`GitHub dispatch failed (${response.status}): ${body}`, { status: 502 });
  }

  return new Response(
    JSON.stringify({
      ok: true,
      repo: REPO,
      workflow: WORKFLOW_FILE,
      at: new Date().toISOString(),
    }),
    { headers: { "content-type": "application/json" } },
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== "/trigger") {
      return new Response("GFTracker cron worker. Use POST/GET /trigger", { status: 404 });
    }

    if (env.CRON_SECRET) {
      const secret = url.searchParams.get("secret");
      if (secret !== env.CRON_SECRET) {
        return new Response("Unauthorized", { status: 401 });
      }
    }

    if (isScrapePaused(env)) {
      return new Response(
        JSON.stringify({
          ok: false,
          paused: true,
          message: "GFTracker scraping is paused — GitHub dispatch disabled.",
        }),
        { status: 503, headers: { "content-type": "application/json" } },
      );
    }

    return triggerScrape(env);
  },

  async scheduled(_controller: ScheduledController, env: Env, _ctx: ExecutionContext): Promise<void> {
    if (isScrapePaused(env)) {
      console.log("SCRAPE_PAUSED — skipping scheduled GitHub dispatch");
      return;
    }

    const status = await probeOfferStatus();
    if (status === 404 || status === 410) {
      const hour = new Date().getUTCHours();
      if (hour !== DAILY_CHECK_UTC_HOUR) {
        console.log(
          `Offer HTTP ${status} — skipping hourly GitHub scrape; ` +
            `next daily probe at ${DAILY_CHECK_UTC_HOUR}:15 UTC`,
        );
        return;
      }
      console.log(`Offer HTTP ${status} — running daily availability check via GitHub Actions`);
    } else if (status === 200) {
      console.log("Offer HTTP 200 — triggering hourly scrape");
    } else if (status === 0) {
      console.log("Offer probe failed — triggering scrape so Python can retry");
    } else {
      console.log(`Offer HTTP ${status} — triggering scrape`);
    }

    const response = await triggerScrape(env);
    if (!response.ok) {
      console.error(await response.text());
    }
  },
};
