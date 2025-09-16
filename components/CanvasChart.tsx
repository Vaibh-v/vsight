import * as React from "react";

/** Simple, dependency-free charts (line + horizontal bar) drawn to <canvas>. */

type LineChartProps = {
  values: number[];
  width?: number;
  height?: number;
  yMax?: number;          // optional fixed max
  label?: string;
};

export function LineChart({
  values,
  width = 520,
  height = 160,
  yMax,
  label,
}: LineChartProps) {
  const ref = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = width * dpr;
    c.height = height * dpr;
    c.style.width = `${width}px`;
    c.style.height = `${height}px`;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    // frame
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

    // padding
    const pad = 10;
    const w = width - pad * 2;
    const h = height - pad * 2;

    if (!values || values.length === 0) {
      ctx.fillStyle = "#6b7280";
      ctx.fillText("No data", pad + 6, height / 2);
      return;
    }

    const max = yMax ?? Math.max(1, ...values);
    const stepX = w / Math.max(1, values.length - 1);

    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2;
    ctx.beginPath();
    values.forEach((v, i) => {
      const x = pad + i * stepX;
      const y = pad + (1 - (v / max)) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    if (label) {
      ctx.fillStyle = "#111827";
      ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
      ctx.fillText(label, pad + 6, pad + 14);
    }
  }, [values, width, height, yMax, label]);

  return <canvas ref={ref} />;
}

type Bar = { label: string; value: number };
type HBarProps = {
  bars: Bar[];
  width?: number;
  height?: number;
  maxBars?: number;
};

export function HBarChart({
  bars,
  width = 520,
  height = 220,
  maxBars = 10,
}: HBarProps) {
  const ref = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = width * dpr;
    c.height = height * dpr;
    c.style.width = `${width}px`;
    c.style.height = `${height}px`;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const pad = 10;
    const innerW = width - pad * 2;
    const innerH = height - pad * 2;

    // frame
    ctx.strokeStyle = "#e5e7eb";
    ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

    const rows = bars.slice(0, maxBars);
    if (!rows.length) {
      ctx.fillStyle = "#6b7280";
      ctx.fillText("No data", pad + 6, height / 2);
      return;
    }

    const max = Math.max(...rows.map(b => b.value), 1);
    const rowH = innerH / rows.length;

    ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
    rows.forEach((b, i) => {
      const y = pad + i * rowH;
      const barW = (b.value / max) * (innerW - 120); // space for labels on left/right
      // label
      ctx.fillStyle = "#111827";
      const text = b.label.length > 30 ? b.label.slice(0, 27) + "…" : b.label;
      ctx.fillText(text, pad + 6, y + rowH * 0.65);
      // bar
      ctx.fillStyle = "#4f46e5";
      ctx.fillRect(pad + 120, y + rowH * 0.2, barW, rowH * 0.6);
      // value
      ctx.fillStyle = "#111827";
      ctx.fillText(String(b.value), pad + 120 + barW + 6, y + rowH * 0.65);
    });
  }, [bars, width, height, maxBars]);

  return <canvas ref={ref} />;
}
