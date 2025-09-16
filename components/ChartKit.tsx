// components/ChartKit.tsx
import * as React from "react";
import {
  Chart, LineController, LineElement, PointElement, LinearScale,
  CategoryScale, BarController, BarElement, Tooltip, Legend, Filler
} from "chart.js";

Chart.register(
  LineController, LineElement, PointElement, LinearScale, CategoryScale,
  BarController, BarElement, Tooltip, Legend, Filler
);

type LineProps = {
  labels: string[];
  series: { label: string; data: number[] }[];
  height?: number;
};

export function LineChartModern({ labels, series, height = 160 }: LineProps) {
  const ref = React.useRef<HTMLCanvasElement | null>(null);
  const chartRef = React.useRef<Chart | null>(null);

  React.useEffect(() => {
    if (!ref.current) return;
    chartRef.current?.destroy();
    chartRef.current = new Chart(ref.current, {
      type: "line",
      data: {
        labels,
        datasets: series.map((s, i) => ({
          label: s.label,
          data: s.data,
          tension: 0.35,
          pointRadius: 0,
          borderWidth: 2,
          fill: i === 0 ? "origin" : false,
          backgroundColor: "rgba(79,70,229,0.08)",
          borderColor: "#4f46e5",
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { mode: "index", intersect: false } },
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: "#eef2ff" }, ticks: { precision: 0 } },
        },
      },
    });
    return () => chartRef.current?.destroy();
  }, [labels.join("|"), JSON.stringify(series)]);

  return <div className="h-[160px]"><canvas ref={ref} height={height} /></div>;
}

type BarProps = {
  labels: string[];
  values: number[];
  height?: number;
};

export function BarChartModern({ labels, values, height = 220 }: BarProps) {
  const ref = React.useRef<HTMLCanvasElement | null>(null);
  const chartRef = React.useRef<Chart | null>(null);

  React.useEffect(() => {
    if (!ref.current) return;
    chartRef.current?.destroy();
    chartRef.current = new Chart(ref.current, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "Value",
          data: values,
          borderWidth: 0,
          backgroundColor: "rgba(79,70,229,0.6)",
        }],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { grid: { color: "#eef2ff" } }, y: { grid: { display: false } } },
      },
    });
    return () => chartRef.current?.destroy();
  }, [labels.join("|"), values.join("|")]);

  return <div className="h-[220px]"><canvas ref={ref} height={height} /></div>;
}
