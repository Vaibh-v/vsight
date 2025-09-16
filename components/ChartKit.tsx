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

export function LineChartMini({
  labels,
  data,
  height = 120,
  title,
}: {
  labels: string[];
  data: number[];
  height?: number;
  title?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 p-3">
      {title && <div className="text-sm mb-2 text-gray-700">{title}</div>}
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
              tension: 0.35,
            },
          ],
        }}
        options={{
          responsive: true,
          plugins: { legend: { display: false }, tooltip: { intersect: false } },
          scales: { x: { display: false }, y: { display: false } },
        }}
      />
    </div>
  );
}

export function BarChartModern({
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
    <div className="rounded-lg border border-gray-200 p-3">
      {title && <div className="text-sm mb-2 text-gray-700">{title}</div>}
      <ReactChart
        type="bar"
        height={height}
        data={{
          labels,
          datasets: [
            {
              label: title ?? "",
              data,
              borderWidth: 1,
            },
          ],
        }}
        options={{
          indexAxis: "y",
          responsive: true,
          plugins: { legend: { display: false } },
          scales: { x: { beginAtZero: true } },
        }}
      />
    </div>
  );
}
