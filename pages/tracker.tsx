import { useState } from "react";

export default function TrackerPage() {
  const [siteUrl, setSiteUrl] = useState<string>("");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function onRun() {
    try {
      if (!siteUrl) {
        alert("Pick a Search Console property first.");
        return;
      }
      setLoading(true);
      setRows([]);

      const params = new URLSearchParams({
        siteUrl,
        limit: "10", // API defaults ok; explicit is fine
      });

      const r = await fetch(`/api/google/gsc/top-queries?${params.toString()}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || `HTTP ${r.status}`);
      setRows(Array.isArray(j?.rows) ? j.rows : []);
    } catch (e: any) {
      alert(e?.message || "Failed to run tracker");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold mb-4">Organic Tracker</h1>

      <div className="flex gap-2 items-center mb-4">
        {/* Replace this select's options with your real SC properties */}
        <select
          value={siteUrl}
          onChange={(e) => setSiteUrl(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="">Select property…</option>
          <option value="sc-domain:zentrades.pro">sc-domain:zentrades.pro</option>
          {/* ... */}
        </select>
        <button
          onClick={onRun}
          disabled={loading || !siteUrl}
          className="bg-purple-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? "Running…" : "Run"}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">Query</th>
              <th className="py-2 pr-4">Clicks</th>
              <th className="py-2 pr-4">Impr.</th>
              <th className="py-2 pr-4">CTR</th>
              <th className="py-2 pr-4">Avg Pos</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td className="py-3 text-gray-500" colSpan={5}>
                  Run the tracker to see Top-10 queries.
                </td>
              </tr>
            )}
            {rows.map((r, i) => (
              <tr key={i} className="border-b">
                <td className="py-2 pr-4">{r.query}</td>
                <td className="py-2 pr-4">{r.clicks}</td>
                <td className="py-2 pr-4">{r.impressions}</td>
                <td className="py-2 pr-4">{(Number(r.ctr) || 0).toFixed(2)}%</td>
                <td className="py-2 pr-4">{(Number(r.position) || 0).toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
