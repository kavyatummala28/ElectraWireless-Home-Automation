interface Point {
  label: string;
  value: number;
}

export function EnergyAreaChart({ data, height = 220 }: { data: Point[]; height?: number }) {
  const width = 320;
  const chartHeight = 150;
  const padX = 10;
  const max = Math.max(...data.map((p) => p.value), 1);
  const min = Math.min(...data.map((p) => p.value), 0);
  const span = Math.max(max - min, 1);
  const points = data.map((p, i) => {
    const x = padX + (i / Math.max(data.length - 1, 1)) * (width - padX * 2);
    const y = 14 + (1 - (p.value - min) / span) * (chartHeight - 28);
    return { x, y, ...p };
  });
  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L${points.at(-1)?.x ?? padX} ${chartHeight - 4} L${padX} ${chartHeight - 4} Z`;
  const ticks = points.filter(
    (_, i) => i % Math.ceil(data.length / 6) === 0 || i === data.length - 1,
  );

  return (
    <div className="w-full" style={{ height }}>
      <svg
        viewBox={`0 0 ${width} ${chartHeight}`}
        className="h-full w-full"
        role="img"
        aria-label="Energy consumption chart"
      >
        <defs>
          <linearGradient id="ellyFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2].map((row) => (
          <line
            key={row}
            x1="8"
            x2="312"
            y1={28 + row * 42}
            y2={28 + row * 42}
            stroke="var(--color-border)"
            strokeDasharray="4 5"
          />
        ))}
        <path d={area} fill="url(#ellyFill)" />
        <path
          d={line}
          fill="none"
          stroke="#a855f7"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p) => (
          <circle
            key={`${p.label}-${p.value}`}
            cx={p.x}
            cy={p.y}
            r="2.3"
            fill="#a855f7"
          />
        ))}
        {ticks.map((p) => (
          <text
            key={p.label}
            x={p.x}
            y="146"
            textAnchor="middle"
            fontSize="9"
            fill="var(--color-muted-foreground)"
          >
            {p.label}
          </text>
        ))}
        <text x="8" y="16" fontSize="10" fill="var(--color-muted-foreground)" fontWeight="500">Watts</text>
        <text x={width - 8} y="146" fontSize="10" fill="var(--color-muted-foreground)" fontWeight="500" textAnchor="end">Time</text>
      </svg>
    </div>
  );
}

export function EnergyBarChart({ data, height = 260 }: { data: Point[]; height?: number }) {
  const max = Math.max(...data.map((p) => p.value), 1);

  return (
    <div
      className="space-y-3"
      style={{ minHeight: height }}
      role="img"
      aria-label="Top energy consumers chart"
    >
      {data.map((item) => (
        <div key={item.label} className="grid grid-cols-[7rem_1fr_3rem] items-center gap-2 text-xs">
          <span className="truncate text-muted-foreground">{item.label}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-muted">
            <span
              className="block h-full rounded-full bg-accent"
              style={{ width: `${Math.max((item.value / max) * 100, 5)}%` }}
            />
          </span>
          <span className="text-right font-medium">{item.value} W</span>
        </div>
      ))}
    </div>
  );
}
