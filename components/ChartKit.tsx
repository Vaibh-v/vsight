// components/ChartKit.tsx
// Modern wrappers around chart.js + react-chartjs-2

"use client";

import React from "react";
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  BarController,
  BarElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";

Chart.register(
  LineController,
  LineElement,
  PointElement,
  BarController,
  BarElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler
);

export type LineProps = {
  labels: string[];
  data: number[];
  height?: number;
  title?: string;
};

export type BarProps = {
  labels: string[];
  data: number[];
  height?: number;
  title?: string;
};

const baseFont = {
  family:
    "'Inter', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto",
};

function lineOptions(title?: string): any {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: title ? { display: true, text: title } : undefined,
      tooltip: { mode: "index", intersect: false },
    },
    scales: {
      x: { ticks: { maxRotation: 0, autoSkip: true, font: baseFont } },
      y: { ticks: { font: baseFont }, beginAtZero: true },
    },
    elements: { line: { tension: 0.35 }, point: { radius: 0 } },
  };
}

function barOptions(title?: string): any {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: title ? { display: true, text: title } : undefined,
      tooltip: { mode: "index", intersect: false },
    },
    scales: {
      x: { ticks: { font: baseFont } },
      y: { ticks: { font: baseFont }, beginAtZero: true },
    },
  };
}

// -------- Public components --------

export function LineChartModern({ labels, data, height = 220, title }: LineProps) {
  const ds = {
    labels,
    datasets: [
      {
        label: title ?? "Series",
        data,
        fill: true,
        borderWidth: 2,
        pointRadius: 0,
      },
    ],
  };
  return (
    <div style={{ height }}>
      <Line data={ds} options={lineOptions(title)} />
    </div>
  );
}

export function BarChartModern({ labels, data, height = 260, title }: BarProps) {
  const ds = {
    labels,
    datasets: [
      {
        label: title ?? "Series",
        data,
        borderWidth: 0,
      },
    ],
  };
  return (
    <div style={{ height }}>
      <Bar data={ds} options={barOptions(title)} />
    </div>
  );
}

// Back-compat aliases if other files still import "Mini"
export const LineChartMini = LineChartModern;
export const BarChartMini = BarChartModern;
