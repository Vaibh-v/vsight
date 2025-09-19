// components/ChartKit.tsx
"use client";

import {
  Chart as CJS,
  LineElement,
  BarElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
  TimeScale,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import React from "react";

CJS.register(
  LineElement,
  BarElement,
  PointElement,
  LinearScale,
  CategoryScale,
  TimeScale,
  Tooltip,
  Legend,
  Filler
);

type Series = { label: string; data: number[] };

type CommonProps = {
  labels: string[];
  series: Series[];
  height?: number;
  title?: string;
};

const baseOptions = (title?: string): any => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: true, position: "top" as const },
    title: title ? { display: true, text: title } : { display: false },
    tooltip: { mode: "index" as const, intersect: false },
  },
  interaction: { mode: "index" as const, intersect: false },
  scales: {
    x: { grid: { display: false } },
    y: { grid: { color: "rgba(0,0,0,0.06)" }, beginAtZero: true },
  },
});

const toDatasets = (series: Series[], type: "line" | "bar") =>
  series.map((s, i) => {
    const base = {
      label: s.label,
      data: s.data,
      borderWidth: 2,
      tension: 0.35,
    } as any;

    // let Chart.js choose default colors; we don’t hardcode colors
    if (type === "line") {
      return { ...base, fill: true };
    }
    return base;
  });

export function LineChartModern({ labels, series, height = 280, title }: CommonProps) {
  const data = React.useMemo(
    () => ({ labels, datasets: toDatasets(series, "line") }),
    [labels, series]
  );
  const options = React.useMemo(() => baseOptions(title), [title]);

  return (
    <div style={{ height }}>
      <Line data={data} options={options} />
    </div>
  );
}

export function BarChartModern({ labels, series, height = 280, title }: CommonProps) {
  const data = React.useMemo(
    () => ({ labels, datasets: toDatasets(series, "bar") }),
    [labels, series]
  );
  const options = React.useMemo(() => baseOptions(title), [title]);

  return (
    <div style={{ height }}>
      <Bar data={data} options={options} />
    </div>
  );
}

// Tiny sparkline-style line
export function LineChartMini({ labels, series, height = 120, title }: CommonProps) {
  const data = React.useMemo(
    () => ({ labels, datasets: toDatasets(series, "line") }),
    [labels, series]
  );
  const options = React.useMemo(
    () => ({
      ...baseOptions(title),
      plugins: { legend: { display: false }, title: { display: !!title, text: title } },
      scales: {
        x: { display: false },
        y: { display: false },
      },
    }),
    [title]
  );

  return (
    <div style={{ height }}>
      <Line data={data} options={options} />
    </div>
  );
}
