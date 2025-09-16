// pages/tracker.tsx
import { useSession, signIn } from "next-auth/react";
import { useState } from "react";
import { safeFetchJSON, toISO } from "@/lib/safeFetch";
import CountrySelect from "@/components/CountrySelect";
import { BarChartMini } from "@/components/ChartKit";
import GSCSitePicker from "@/components/GSCSitePicker";

type Row = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number };

export default function Tracker() {
  const { status } = useSession();
  const [siteUrl, setSiteUrl] = useState<string | undefined>();
  const [dimension, setDimension] = useState<"query" | "page">("page");
  const [country, setCountry] = useState<string | undefined>("");
  const [device, setDevice] = useState<"All" | "Desktop" | "Mobile" | "Tablet">("All");
  const [start, setStart] = useState<string>(toISO(new Date(Date.now() - 30 * 864e5))!);
  const [end, setEnd] = useState<string>(toISO(new Date())!);
  const [keywordMode, setKeywordMode] = useState<"contains" | "equals">("contains");
  const [keywordValue, setKeywordValue] = useState<string>("");
  const [sortBy, setSortBy] = useState<"clicks" | "impressions" | "ctr" | "position">("clicks");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string>("");

  const run = async () => {
    setErr("");
    setRows([]);
    try {
      if (!siteUrl) throw new Error("Select a GSC property first.");
      const payload = {
        siteUrl,
        startDate: start,
        endDate: end,
        dimension,
        rowLimit: 25,
        countryCode: country || undefined,
        device: device === "All" ? undefined : device,
        keywordMode,
        keywordValue: keywordValue.trim() || undefined,
        sortBy, sortDir,
      };
      const data = await safeFetchJSON<{ rows: Row[] }>("/api/gsc/query", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setRows(data.rows);
    } catch (e: any) {
      setErr(e.message || String(e));
    }
  };

  if (status === "unauthenticated") {
    return (
      <div className="p-6">
        <p className="mb-3">Sign in to use the Organic Tracker.</p>
        <button className="px-3 py-2 rounded bg-black text-white" onClick={() => signIn()}>Sign in</button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="col-span-2">
          <label className="block text-sm mb-1">GSC Property</label>
          <GSCSitePicker value={siteUrl} onChange={setSiteUrl} />
        </div>

        <div>
          <label className="block text-sm mb-1">Dimension</label>
          <select className="border rounded px-2 py-1 w-full"
            value={dimension} onChange={e => setDimension(e.target.value as any)}>
            <option value="query">Query</option>
            <option value="page">Page</option>
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Row limit</label>
          <input type="number" className="border rounded px-2 py-1 w-full" defaultValue={25} readOnly />
        </div>

        <div>
          <label className="block text-sm mb-1">Country (optional)</label>
          <CountrySelect value={country} onChange={setCountry} />
        </div>

        <div>
          <label className="block text-sm mb-1">Device (optional)</label>
          <select className="border rounded px-2 py-1 w-full"
            value={device} onChange={e => setDevice(e.target.value as any)}>
            <option>All</option><option>Desktop</option><option>Mobile</option><option>Tablet</option>
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Start</label>
          <input type="date" className="border rounded px-2 py-1 w-full"
            value={start} onChange={e => setStart(toISO(e.target.value) || start)} />
        </div>

        <div>
          <label className="block text-sm mb-1">End</label>
          <input type="date" className="border rounded px-2 py-1 w-full"
            value={end} onChange={e => setEnd(toISO(e.target.value) || end)} />
        </div>

        <div>
          <label className="block text-sm mb-1">Keyword mode</label>
          <select className="border rounded px-2 py-1 w-full"
            value={keywordMode} onChange={e => setKeywordMode(e.target.value as any)}>
            <option value="contains">contains</option>
            <option value="equals">equals</option>
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Keyword</label>
          <input className="border rounded px-2 py-1 w-full"
            placeholder="e.g., nfpa 10" value={keywordValue} onChange={e => setKeywordValue(e.target.value)} />
        </div>

        <div>
          <label className="block text-sm mb-1">Sort</label>
          <div className="flex gap-2">
            <select className="border rounded px-2 py-1 w-full"
              value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
              <option value="clicks">Clicks</option>
              <option value="impressions">Impr.</option>
              <option value="ctr">CTR</option>
              <option value="position">Avg Pos</option>
            </select>
            <select className="border rounded px-2 py-1"
              value={sortDir} onChange={e => setSortDir(e.target.value as any)}>
              <option value="desc">desc</option>
              <option value="asc">asc</option>
            </select>
          </div>
        </div>

        <div className="flex items-end">
          <button className="px-3 py-2 rounded bg-purple-600 text-white" onClick={run}>Run</button>
        </div>
      </div>

      {err && <div className="text-red-600 text-sm">{err}</div>}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="col-span-3 border rounded p-3 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">{dimension === "page" ? "Page" : "Query"}</th>
                <th className="py-2">Clicks</th>
                <th className="py-2">Impr.</th>
                <th className="py-2">CTR</th>
                <th className="py-2">Avg Pos</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={5} className="py-4 text-gray-500">Run the tracker to see results.</td></tr>
              )}
              {rows.map((r, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-2 break-all">{r.keys?.[0] ?? "-"}</td>
                  <td className="py-2">{r.clicks ?? 0}</td>
                  <td className="py-2">{r.impressions ?? 0}</td>
                  <td className="py-2">{((r.ctr ?? 0) * 100).toFixed(2)}%</td>
                  <td className="py-2">{(r.position ?? 0).toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="col-span-2 border rounded p-3">
          <div className="font-medium mb-2">Top 10 by Clicks</div>
          <BarChartMini
            labels={rows.slice(0, 10).map(r => r.keys?.[0] ?? "")}
            data={rows.slice(0, 10).map(r => r.clicks ?? 0)}
            height={300}
          />
        </div>
      </div>
    </div>
  );
}
