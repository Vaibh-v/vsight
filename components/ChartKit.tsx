// components/ChartKit.tsx
import React from "react";
import {
  Chart as ChartJS,
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
  ChartOptions,
  ChartData,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";

ChartJS.register(
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

/** -------- Utilities -------- */
const guardTick = (v: unknown) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return "";
  if (Math.abs(n) >= 1000) return `${Math.round(n / 1000)}k`;
  return `${Math.round(n)}`;
};

const baseLineOptions = (title?: string): ChartOptions<"line"> => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    title: title ? { display: true, text: title } : undefined,
    tooltip: { intersect: false, mode: "index" },
  },
  scales: {
    x: { grid: { display: false } },
    y: {
      grid: { color: "rgba(0,0,0,0.06)" },
      ticks: { callback: guardTick },
    },
  },
  elements: {
    line: { tension: 0.35, borderWidth: 2, fill: false },
    point: { radius: 0 },
  },
});

const baseBarOptions = (title?: string): ChartOptions<"bar"> => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    title: title ? { display: true, text: title } : undefined,
    tooltip: { intersect: true, mode: "nearest" },
  },
  scales: {
    x: { grid: { display: false } },
    y: {
      grid: { color: "rgba(0,0,0,0.06)" },
      ticks: { callback: guardTick },
    },
  },
});

/** -------- Public components -------- */

export type LineProps = {
  labels: string[];
  data: number[];
  height?: number;
  title?: string;
};

export const LineChartModern: React.FC<LineProps> = ({
  labels,
  data,
  height = 220,
  title,
}) => {
  const chartData: ChartData<"line"> = {
    labels: labels ?? [],
    datasets: [
      {
        label: title ?? "",
        data: data ?? [],
        borderColor: "rgb(99,102,241)", // indigo-ish (Chart.js default palette)
        backgroundColor: "rgba(99,102,241,0.25)",
        fill: true,
      },
    ],
  };
  return (
    <div style={{ height }}>
      <Line options={baseLineOptions(title)} data={chartData} />
    </div>
  );
};

export type BarProps = {
  labels: string[];
  data: number[];
  height?: number;
  title?: string;
};

export const BarChartModern: React.FC<BarProps> = ({
  labels,
  data,
  height = 220,
  title,
}) => {
  const chartData: ChartData<"bar"> = {
    labels: labels ?? [],
    datasets: [
      {
        label: title ?? "",
        data: data ?? [],
        borderWidth: 1,
      },
    ],
  };
  return (
    <div style={{ height }}>
      <Bar options={baseBarOptions(title)} data={chartData} />
    </div>
  );
};

/** Tiny sparkline option kept for existing imports */
export const LineChartMini = LineChartModern;
