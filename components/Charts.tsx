import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar, Line } from "recharts";
export function TrafficChart({ data }: { data: any[] }) {
  const withMA = data.map((d, i, arr) => { const s = Math.max(0, i - 6); const span = arr.slice(s, i + 1); const ma = span.reduce((sum, x) => sum + (x.sessions ?? 0), 0) / span.length; return { ...d, sessionsMA7: Math.round(ma) }; });
  return (
    <div className="w-full h-[360px]">
      <ResponsiveContainer>
        <ComposedChart data={withMA}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" minTickGap={24} />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip /><Legend />
          <Bar yAxisId="left" dataKey="sessions" name="Sessions" />
          <Line yAxisId="left" type="monotone" dataKey="sessionsMA7" dot={false} name="Sessions (7d MA)" />
          <Line yAxisId="right" type="monotone" dataKey="clicks" dot={false} name="Clicks" />
          <Line yAxisId="right" type="monotone" dataKey="ctr" dot={false} name="CTR" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
