// components/Charts.tsx
import React from "react";

export function TrafficChart({ data }: { data: Array<any> }) {
  // Render a simple table — zero deps, fast & reliable
  const rows = Array.isArray(data) ? data : [];
  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-2 text-left">Date</th>
            <th className="p-2 text-right">Sessions</th>
            <th className="p-2 text-right">Clicks</th>
            <th className="p-2 text-right">Impr.</th>
            <th className="p-2 text-right">CTR</th>
            <th className="p-2 text-right">Avg Pos</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td className="p-3 text-gray-500" colSpan={6}>No data.</td></tr>
          ) : (
            rows.map((r, i) => (
              <tr key={i} className={i % 2 ? "bg-white" : "bg-gray-50/50"}>
                <td className="p-2">{r.date}</td>
                <td className="p-2 text-right">{r.sessions ?? 0}</td>
                <td className="p-2 text-right">{r.clicks ?? 0}</td>
                <td className="p-2 text-right">{r.impressions ?? 0}</td>
                <td className="p-2 text-right">
                  {typeof r.ctr === "number" ? (r.ctr * 100).toFixed(2) : "0.00"}%
                </td>
                <td className="p-2 text-right">
                  {typeof r.position === "number" ? r.position.toFixed(1) : ""}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
