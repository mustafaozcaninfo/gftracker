interface PriceSparklineProps {
  values: number[];
  className?: string;
}

export function PriceSparkline({ values, className = "" }: PriceSparklineProps) {
  if (!values || values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 72;
  const height = 24;
  const step = width / (values.length - 1);

  const points = values
    .map((value, index) => {
      const x = index * step;
      const y = height - ((value - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  const trendingDown = values[values.length - 1] < values[0];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`${className}`}
      width={width}
      height={height}
      aria-hidden
    >
      <polyline
        fill="none"
        stroke={trendingDown ? "#059669" : "#a3845c"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}
