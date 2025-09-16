import React from "react";
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  BarController,
  BarElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Chart as ReactChart } from "react-chartjs-2";

// Register Chart.js pieces once
Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  BarController,
  BarElement,
  Tooltip,
  Legend,
  Filler
);

// ---- Types ----
type LineSeries = { label: string; data: number[] };
type CommonProps = {
  labels: string[];
  title?: string;
  height?: number;
};

// Accept EITHER a single data series OR multiple series
type LineChartProps =
  | (CommonProps & { data: number[]; series?: never })
  | (CommonProps & { series: LineSeries[]; data?: never });

type BarChartProps =
  | (CommonProps & { data: number[]; series?: never })
  | (CommonProps & { series: LineSeries[]; data?: never });

// ---- Line charts ----
export function LineChartMini({ labels, data, height = 120, title }: LineChartProps) {
  const datasets =
    (data
      ? [{ label: title ?? "", data, fill: false, tension: 0.35 }]
      : undefined) ??
    []; // (LineChartMini is used for sparkline-style charts with single series)
  return (
    <div className="rounded-lg border border-gray-200 p-3">
      {title && <div className="text-sm mb-2 text-gray-700">{title}</div>}
      <ReactChart
        type="line"
        height={height}
        data={{ labels, datasets }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { intersect: false } },
          scales: { x: { display: false }, y: { display: false } },
          elements: { point: { radius: 0 } },
        }}
      />
    </div>
  );
}

// Back-compat alias (dashboard imports LineChartModern with `series`)
export function LineChartModern({ labels, title, height = 220, ...rest }: LineChartProps) {
  const datasets =
    "series" in rest && rest.series
      ? rest.series.map((s) => ({
          label: s.label,
          data: s.data,
          fill: false,
          tension: 0.35,
        }))
      : "data" in rest && rest.data
      ? [{ label: title ?? "", data: rest.data, fill: false, tension: 0.35 }]
      : [];

  return (
    <div className="rounded-lg border border-gray-200 p-3">
      {title && <div className="text-sm mb-2 text-gray-700">{title}</div>}
      <div style={{ height }}>
        <ReactChart
          type="line"
          data={{ labels, datasets }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: datasets.length > 1 } },
            interaction: { intersect: false, mode: "index" },
            elements: { point: { radius: 2 } },
            scales: {
              x: { grid: { display: false } },
              y: { beginAtZero: true, grid: { color: "rgba(0,0,0,0.06)" } },
            },
          }}
        />
      </div>
    </div>
  );
}

// ---- Bar chart ----
export function BarChartModern({ labels, title, height = 260, ...rest }: BarChartProps) {
  const datasets =
    "series" in rest && rest.series
      ? rest.series.map((s) => ({
          label: s.label,
          data: s.data,
          borderWidth: 1,
        }))
      : "data" in rest && rest.data
      ? [{ label: title ?? "", data: rest.data, borderWidth: 1 }]
      : [];

  return (
    <div className="rounded-lg border border-gray-200 p-3">
      {title && <div className="text-sm mb-2 text-gray-700">{title}</div>}
      <div style={{ height }}>
        <ReactChart
          type="bar"
          data={{ labels, datasets }}
          options={{
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: datasets.length > 1 } },
            scales: {
              x: { beginAtZero: true, grid: { color: "rgba(0,0,0,0.06)" } },
              y: { grid: { display: false } },
            },
          }}
        />
      </div>
    </div>
  );
}
