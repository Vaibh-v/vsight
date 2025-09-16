// components/ChartKit.tsx
"use client";

import {
  Chart, LineController, LineElement, PointElement, LinearScale,
  CategoryScale, BarController, BarElement, Tooltip, Legend, Filler,
} from "chart.js";
import { Chart as ReactChart } from "react-chartjs-2";
import { memo } from "react";

Chart.register(
  LineController, LineElement, PointElement, LinearScale, CategoryScale,
  BarController, BarElement, Tooltip, Legend, Filler
);

type LineProps = {
  labels: string[];
  data: number[];
  height?: number;
  title?: string;
};

type BarProps = {
  labels: string[];
  data: number[];
  height?: number;
  title?: string;
};

const commonOpts = (title?: string) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    title: title ? { display: true, text: title } : { display: false },
    tooltip: { intersect: false, mode: "index" as const },
  },
  interaction: { intersect: false, mode: "index" as const },
  scales: {
    x: { grid: { display: false }, ticks: { maxTicksLimit: 12 } },
    y: { grid: { color: "#eee" } },
  },
});

export const LineChartMini = memo(function LineChartMini(props: LineProps) {
  const { labels, data, height = 220, title } = props;
  const ds = {
    labels,
    datasets: [{
      label: title || "Series",
      data,
      fill: true,
      tension: 0.35,
    }],
  };
  return (
    <div style={{ height }}>
      <ReactChart type="line" data={ds} options={commonOpts(title)} />
    </div>
  );
});

export const BarChartMini = memo(function BarChartMini(props: BarProps) {
  const { labels, data, height = 220, title } = props;
  const ds = {
    labels,
    datasets: [{
      label: title || "Series",
      data,
    }],
  };
  return (
    <div style={{ height }}>
      <ReactChart type="bar" data={ds} options={commonOpts(title)} />
    </div>
  );
});
