// /components/ChartKit.tsx
import React from "react";
import {
  Chart as ChartJS,
  LinearScale,
  CategoryScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Chart as ReactChart } from "react-chartjs-2";

ChartJS.register(LinearScale, CategoryScale, BarElement, PointElement, LineElement, Tooltip, Legend, Filler);

export function LineChartMini({
  labels,
  data,
  height = 220,
  title,
}: {
  labels: string[];
  data: number[];
  height?: number;
  title?: string;
}) {
  return (
    <ReactChart
      type="line"
      height={height}
      data={{
        labels,
        datasets: [
          {
            label: title ?? "",
            data,
            fill: false,
            tension: 0.25,
            pointRadius: 0,
            borderWidth: 2,
          },
        ],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: !!title } },
        scales: {
          x: {
            ticks: {
              autoSkip: true,
              autoSkipPadding: 8,
              maxRotation: 0,
              callback(value, idx, ticks) {
                const step = Math.max(1, Math.ceil(ticks.length / 7));
                // @ts-ignore
                const label = this.getLabelForValue(value);
                return idx % step === 0 ? label : "";
              },
            },
          },
          y: { beginAtZero: true },
        },
      }}
    />
  );
}

export function BarChartMini({
  labels,
  data,
  height = 260,
  title,
}: {
  labels: string[];
  data: number[];
  height?: number;
  title?: string;
}) {
  return (
    <ReactChart
      type="bar"
      height={height}
      data={{
        labels,
        datasets: [{ label: title ?? "", data, borderWidth: 1 }],
      }}
      options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: !!title } },
        scales: {
          x: {
            ticks: {
              autoSkip: false,
              callback(this: any, v: any) {
                const label = this.getLabelForValue(v);
                return label.length > 20 ? label.slice(0, 20) + "…" : label;
              },
            },
          },
          y: { beginAtZero: true },
        },
      }}
    />
  );
}
