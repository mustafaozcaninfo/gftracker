"use client";

interface PriceHistoryChartProps {
  points: Array<[string, number, number]>;
}

export function PriceHistoryChart({ points }: PriceHistoryChartProps) {
  if (!points.length) {
    return (
      <p className="text-sm text-neutral-500">
        Price history will appear after multiple daily scrapes.
      </p>
    );
  }

  const prices = points.map(([, price]) => price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  return (
    <div className="space-y-3">
      <p className="sr-only">
        Price history chart from {points[0][0]} to {points[points.length - 1][0]}.
        Lowest {min.toLocaleString()} QAR, highest {max.toLocaleString()} QAR across{" "}
        {points.length} recorded points.
      </p>
      <div
        className="flex h-32 items-end gap-1 rounded-xl border border-black/10 bg-neutral-50 p-3"
        role="img"
        aria-hidden="true"
      >
        {points.map(([date, price]) => {
          const height = ((price - min) / range) * 100;
          return (
            <div
              key={date}
              className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
              title={`${date}: ${price} QAR`}
            >
              <div
                className="w-full min-w-[4px] rounded-t bg-gl-gold"
                style={{ height: `${Math.max(height, 8)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-neutral-500 sm:text-xs">
        <span>{points[0][0]}</span>
        <span>
          Low {min.toLocaleString()} · High {max.toLocaleString()} QAR
        </span>
        <span>{points[points.length - 1][0]}</span>
      </div>
    </div>
  );
}
