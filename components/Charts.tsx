// components/Charts.tsx
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from "recharts";

export function TrafficChart({ data }: { data: Array<any> }) {
  // Expect items: { date: "YYYYMMDD", sessions?: number, clicks?: number, ctr?: number }
  // Render sessions & clicks on left, CTR on right axis.
  return (
    <div style={{ height: 360 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis yAxisId="l" />
          <YAxis yAxisId="r" orientation="right" />
          <Tooltip />
          <Legend />
          <Line yAxisId="l" type="monotone" dataKey="sessions" name="Sessions" strokeWidth={2} dot={false} />
          <Line yAxisId="l" type="monotone" dataKey="clicks" name="Clicks" strokeWidth={2} dot={false} />
          <Line yAxisId="r" type="monotone" dataKey="ctr" name="CTR (%)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
