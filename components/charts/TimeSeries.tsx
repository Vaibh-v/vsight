import React from "react";

type Serie = { name: string; points: { x: number; y: number }[] };

export default function TimeSeries({
  width = 700,
  height = 180,
  series,
  minY,
  maxY
}: {
  width?: number;
  height?: number;
  series: Serie[];
  minY?: number;
  maxY?: number;
}) {
  // compute bounds
  const all = series.flatMap((s) => s.points);
  const minX = Math.min(...all.map((p) => p.x));
  const maxX = Math.max(...all.map((p) => p.x));
  const _minY = minY ?? Math.min(...all.map((p) => p.y));
  const _maxY = maxY ?? Math.max(...all.map((p) => p.y));
  const pad = 8;

  const sx = (x: number) =>
    pad + ((x - minX) / (maxX - minX || 1)) * (width - pad * 2);
  const sy = (y: number) =>
    height - pad - ((y - _minY) / (_maxY - _minY || 1)) * (height - pad * 2);

  const colors = ["#2563eb", "#16a34a", "#f59e0b", "#ef4444", "#a855f7"];

  return (
    <svg width={width} height={height} className="w-full">
      <rect x={0} y={0} width={width} height={height} fill="white" />
      {series.map((s, i) => {
        const d = s.points.map((p, j) => `${j ? "L" : "M"} ${sx(p.x)} ${sy(p.y)}`).join(" ");
        return (
          <path
            key={s.name}
            d={d}
            fill="none"
            stroke={colors[i % colors.length]}
            strokeWidth={2}
          />
        );
      })}
    </svg>
  );
}
