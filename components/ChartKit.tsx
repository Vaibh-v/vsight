import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
  TimeScale
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import React from "react";

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  Tooltip, Legend, Filler, TimeScale
);

type LineProps = {
  labels: string[];
  series: { label: string; data: number[] }[];
};

type BarProps = LineProps;

export function LineChartMini({ labels, series }: LineProps) {
  const data = {
    labels,
    datasets: series.map((s, i) => ({
      label: s.label,
      data: s.data,
      tension: 0.3,
      fill: false,
      borderWidth: 2,
      pointRadius: 0
    }))
  };
  const options = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: { x: { display: true }, y: { display: true } }
  };
  return <Line data={data} options={options as any} />;
}

// Backwards-compatible exports (some pages import these names)
export const LineChartModern = LineChartMini;

export function BarChartMini({ labels, series }: BarProps) {
  const data = {
    labels,
    datasets: series.map((s) => ({
      label: s.label,
      data: s.data,
      borderWidth: 1
    }))
  };
  const options = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: { x: { display: true }, y: { display: true } }
  };
  return <Bar data={data} options={options as any} />;
}

export const BarChartModern = BarChartMini;
