// components/ChartKit.tsx
import React from "react";
import {
  Chart,
  LineController, LineElement, PointElement,
  BarController, BarElement,
  LinearScale, CategoryScale, Tooltip, Legend, Filler,
} from "chart.js";
import { Chart as ReactChart } from "react-chartjs-2";

Chart.register(
  LineController, LineElement, PointElement,
  BarController, BarElement,
  LinearScale, CategoryScale, Tooltip, Legend, Filler
);

type LineProps = { labels: string[]; data: number[]; height?: number; title?: string };

export function LineChartMini({ labels, data, height = 180, title }: LineProps) {
  return (
    <ReactChart
      type="line"
      height={height}
      data={{ labels, datasets: [{ data, label: title ?? "", fill: false }] }}
      options={{
        responsive: true,
        plugins: { legend: { display: false }, title: { display: !!title, text: title } },
        elements: { line: { tension: 0.35, borderWidth: 2 }, point: { radius: 0 } },
        scales: { x: { display: false }, y: { display: false } },
      }}
    />
  );
}

type BarProps = { labels: string[]; data: number[]; height?: number; title?: string };

export function BarChartMini({ labels, data, height = 220, title }: BarProps) {
  return (
    <ReactChart
      type="bar"
      height={height}
      data={{ labels, datasets: [{ data, label: title ?? "", borderWidth: 1 }] }}
      options={{
        responsive: true,
        plugins: { legend: { display: false }, title: { display: !!title, text: title } },
        indexAxis: "y",
      }}
    />
  );
}
