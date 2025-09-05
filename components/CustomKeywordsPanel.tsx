import { useState } from "react";

export default function CustomKeywordsPanel() {
  const [keywords, setKeywords] = useState("");
  const [country, setCountry] = useState("USA");
  const [state, setState] = useState("");
  const [domain, setDomain] = useState("");
  const [topN, setTopN] = useState(10);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    setRows([]);
    try {
      const kws = keywords.split("\n").map((k) => k.trim()).filter(Boolean);
      const r = await fetch("/api/serp/rank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords: kws,
          region: { country, state: state || undefined },
          topN,
          domain: domain || undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || r.statusText);
      const flat = j.data.flatMap((k: any) =>
        k.rows.map((row: any) => ({
          keyword: k.keyword,
          rank: row.rank,
          url: row.url,
          title: row.title,
          provider: row.provider,
          domain_match: row.domain_match ? "✓" : "",
        }))
      );
      setRows(flat);
    } catch (e: any) {
      setError(e.message || "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="border rounded p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Custom Keywords (SERP Top {topN})</h3>
        <div className="flex gap-2">
          <select className="border rounded px-2 py-1" value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value="USA">USA</option>
            <option value="IND">India</option>
            <option value="GBR">UK</option>
            <option value="AUS">Australia</option>
            <option value="CAN">Canada</option>
          </select>
          <input className="border rounded px-2 py-1" placeholder="State (optional)" value={state}
                 onChange={(e) => setState(e.target.value)} />
          <input className="border rounded px-2 py-1" placeholder="Your domain (optional)" value={domain}
                 onChange={(e) => setDomain(e.target.value)} style={{ width: 220 }} />
          <select className="border rounded px-2 py-1" value={topN} onChange={(e) => setTopN(Number(e.target.value))}>
            {[10, 20, 50].map((n) => <option key={n} value={n}>Top {n}</option>)}
          </select>
          <button onClick={run} disabled={loading} className="bg-black text-white rounded px-3 py-1">
            {loading ? "Checking…" : "Check ranks"}
          </button>
        </div>
      </div>

      <textarea className="w-full border rounded p-2 text-sm" rows={5} placeholder="One keyword per line"
                value={keywords} onChange={(e) => setKeywords(e.target.value)} />

      {error && <div className="text-red-600 text-sm">{error}</div>}

      {!!rows.length && (
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-3">Keyword</th>
                <th className="py-2 pr-3">Rank</th>
                <th className="py-2 pr-3">Title</th>
                <th className="py-2 pr-3">URL</th>
                <th className="py-2 pr-3">Match</th>
                <th className="py-2 pr-3">Provider</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-2 pr-3">{r.keyword}</td>
                  <td className="py-2 pr-3">{r.rank}</td>
                  <td className="py-2 pr-3">{r.title || "-"}</td>
                  <td className="py-2 pr-3">
                    <a className="text-blue-600 hover:underline" href={r.url} target="_blank" rel="noreferrer">
                      {r.url}
                    </a>
                  </td>
                  <td className="py-2 pr-3">{r.domain_match}</td>
                  <td className="py-2 pr-3">{r.provider}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
