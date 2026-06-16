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
  const width = 640;
  const height = 128;
  const padX = 8;
  const padY = 10;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const step = points.length > 1 ? innerW / (points.length - 1) : 0;

  const coords = points.map(([date, price], index) => {
    const x = padX + index * step;
    const y = padY + innerH - ((price - min) / range) * innerH;
    return { x, y, date, price };
  });

  const linePoints = coords.map(({ x, y }) => `${x},${y}`).join(" ");
  const areaPoints = [
    `${coords[0].x},${padY + innerH}`,
    ...coords.map(({ x, y }) => `${x},${y}`),
    `${coords[coords.length - 1].x},${padY + innerH}`,
  ].join(" ");

  return (
    <div className="space-y-3">
      <p className="sr-only">
        Price history chart from {points[0][0]} to {points[points.length - 1][0]}.
        Lowest {min.toLocaleString()} QAR, highest {max.toLocaleString()} QAR across{" "}
        {points.length} recorded points.
      </p>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-32 w-full rounded-xl border border-black/10 bg-neutral-50"
        role="img"
        aria-hidden="true"
        preserveAspectRatio="none"
      >
        <line
          x1={padX}
          y1={padY + innerH}
          x2={width - padX}
          y2={padY + innerH}
          stroke="#e5e5e5"
          strokeWidth="1"
        />
        {points.length > 1 && (
          <>
            <polygon points={areaPoints} fill="rgba(163, 132, 92, 0.12)" />
            <polyline
              fill="none"
              stroke="#a3845c"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={linePoints}
            />
          </>
        )}
        {coords.map(({ x, y, date, price }) => (
          <circle
            key={date}
            cx={x}
            cy={y}
            r={points.length === 1 ? 5 : 3.5}
            fill="#a3845c"
          >
            <title>{`${date}: ${price.toLocaleString()} QAR`}</title>
          </circle>
        ))}
      </svg>
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
