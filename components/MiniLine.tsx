// components/MiniLine.tsx
import React from 'react';

type Props = {
  data: number[];
  height?: number;
  strokeWidth?: number;
};

export default function MiniLine({ data, height = 120, strokeWidth = 2 }: Props) {
  if (!data?.length) return <div className="h-[120px] text-sm text-gray-400 flex items-center justify-center">No data</div>;

  const w = 600;
  const h = height;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = Math.max(max - min, 1);
  const stepX = w / Math.max(data.length - 1, 1);

  const pts = data.map((v, i) => {
    const x = i * stepX;
    const y = h - ((v - min) / span) * (h - 6) - 3;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[120px]">
      <polyline fill="none" stroke="currentColor" strokeWidth={strokeWidth} points={pts} />
    </svg>
  );
}
