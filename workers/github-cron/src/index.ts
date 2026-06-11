interface Env {
  GITHUB_PAT: string;
  CRON_SECRET?: string;
}

const REPO = "mustafaozcaninfo/gftracker";
const WORKFLOW_FILE = "daily-tracker.yml";

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

    return triggerScrape(env);
  },

  async scheduled(_controller: ScheduledController, env: Env, _ctx: ExecutionContext): Promise<void> {
    const response = await triggerScrape(env);
    if (!response.ok) {
      console.error(await response.text());
    }
  },
};
