import { SITE_NAME, SITE_PAUSE_MESSAGE, SITE_PAUSE_TITLE } from "@/lib/site";

export function PauseScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gl-red">
        {SITE_NAME}
      </p>
      <h1 className="mt-4 max-w-lg text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
        {SITE_PAUSE_TITLE}
      </h1>
      <p className="mt-5 max-w-md text-balance text-base leading-relaxed text-neutral-600 sm:text-lg">
        {SITE_PAUSE_MESSAGE}
      </p>
    </div>
  );
}
