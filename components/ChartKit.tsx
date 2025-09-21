// components/ChartKit.tsx
import React from "react";
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
  TimeScale,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
  TimeScale
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

const baseGrid = {
  color: "rgba(0,0,0,0.05)",
  drawBorder: false,
};

const baseTicks = {
  color: "#666",
  maxTicksLimit: 8,
};

export function LineChartMini({ labels, data, height = 220, title }: LineProps) {
  const datasetColor = "rgba(59,130,246,1)";
  const datasetBg = "rgba(59,130,246,0.12)";

  const chartData = {
    labels,
    datasets: [
      {
        label: title ?? "Series",
        data,
        borderColor: datasetColor,
        backgroundColor: datasetBg,
        tension: 0.35,
        pointRadius: 0,
        fill: true,
      },
    ],
  };

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: !!title, position: "top" as const },
      tooltip: { mode: "index" as const, intersect: false },
    },
    scales: {
      x: { grid: baseGrid, ticks: baseTicks },
      y: { grid: baseGrid, ticks: baseTicks, beginAtZero: true },
    },
  };

  return (
    <div style={{ height }}>
      <Line data={chartData} options={options} />
    </div>
  );
}

export function BarChartMini({ labels, data, height = 220, title }: BarProps) {
  const barColor = "rgba(16,185,129,1)";
  const barBg = "rgba(16,185,129,0.18)";

  const chartData = {
    labels,
    datasets: [
      {
        label: title ?? "Series",
        data,
        backgroundColor: barBg,
        borderColor: barColor,
        borderWidth: 1,
        barPercentage: 0.7,
        categoryPercentage: 0.7,
      },
    ],
  };

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: !!title, position: "top" as const },
      tooltip: { mode: "index" as const, intersect: false },
    },
    scales: {
      x: { grid: baseGrid, ticks: baseTicks },
      y: { grid: baseGrid, ticks: baseTicks, beginAtZero: true },
    },
  };

  return (
    <div style={{ height }}>
      <Bar data={chartData} options={options} />
    </div>
  );
}
