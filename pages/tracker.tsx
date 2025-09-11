import React, { useEffect, useState } from "react";

export default function OrganicTracker() {
  const [sites, setSites] = useState<any[]>([]);
  const [siteUrl, setSiteUrl] = useState<string>("");
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const s = await fetch("/api/gsc/sites").then((r) => r.json());
      setSites(s?.sites || []);
    })();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold mb-4">Organic Tracker</h1>

      <div className="flex gap-4 items-center mb-4">
        <select
          className="border rounded px-3 py-2"
          value={siteUrl}
          onChange={(e) => setSiteUrl(e.target.value)}
        >
          <option value="">Select GSC site…</option>
          {sites.map((s) => (
            <option key={s.siteUrl} value={s.siteUrl}>
              {s.siteUrl}
            </option>
          ))}
        </select>

        <button
          className="px-3 py-2 rounded bg-violet-600 text-white disabled:opacity-50"
          disabled={!siteUrl}
          onClick={async () => {
            const params = new URLSearchParams({
              siteUrl,
              startDate: "2025-08-01",
              endDate: "2025-09-10",
              rowLimit: "50",
            }).toString();
            const r = await fetch(`/api/google/gsc/top-queries?${params}`).then((x) => x.json());
            setRows(r?.rows || []);
          }}
        >
          Run
        </button>
      </div>

      <div className="overflow-auto">
        <table className="min-w-[700px] w-full text-sm border">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left border-r">Query</th>
              <th className="p-2 text-right border-r">Clicks</th>
              <th className="p-2 text-right border-r">Impr.</th>
              <th className="p-2 text-right border-r">CTR</th>
              <th className="p-2 text-right">Avg Pos</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="p-3 text-gray-500" colSpan={5}>
                  Run the tracker to see Top-10 queries.
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2 border-r">{r.query}</td>
                  <td className="p-2 text-right border-r">{r.clicks}</td>
                  <td className="p-2 text-right border-r">{r.impressions}</td>
                  <td className="p-2 text-right border-r">{(Number(r.ctr || 0) * 100).toFixed(2)}%</td>
                  <td className="p-2 text-right">{Number(r.position || 0).toFixed(1)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
