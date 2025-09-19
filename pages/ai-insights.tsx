// pages/ai-insights.tsx
"use client";

import React from "react";
import { useSession, signIn } from "next-auth/react";
import GSCSitePicker from "@/components/GSCSitePicker";

type Insight = { type: string; text: string };

export default function AiInsights() {
  const { status } = useSession();
  const [siteUrl, setSiteUrl] = React.useState<string | undefined>(undefined);
  const [start, setStart] = React.useState<string>(() => new Date(Date.now() - 29 * 864e5).toISOString().slice(0, 10));
  const [end, setEnd] = React.useState<string>(() => new Date().toISOString().slice(0, 10));
  const [insights, setInsights] = React.useState<Insight[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    setInsights([]);
    try {
      if (!siteUrl) throw new Error("Select a GSC site");

      const qs = new URLSearchParams({ siteUrl, start, end });
      const r = await fetch(`/api/ai/insights?${qs.toString()}`);
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Failed");
      setInsights(data?.insights ?? []);
    } catch (e: any) {
      setError(e?.message || "Run failed");
    } finally {
      setLoading(false);
    }
  };

  if (status === "unauthenticated") {
    return (
      <div className="p-6">
        <button className="border px-4 py-2 rounded" onClick={() => signIn()}>Sign in</button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">AI Insights (rule-based v1)</h1>

      <div className="grid md:grid-cols-4 gap-3">
        <div className="md:col-span-2">
          <label className="text-sm block mb-1">GSC Site</label>
          <GSCSitePicker value={siteUrl} onChange={setSiteUrl} />
        </div>
        <div>
          <label className="text-sm block mb-1">Start</label>
          <input type="date" className="w-full border rounded px-3 py-2" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div>
          <label className="text-sm block mb-1">End</label>
          <input type="date" className="w-full border rounded px-3 py-2" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
        <div className="flex items-end">
          <button className="border px-4 py-2 rounded w-full" onClick={run} disabled={loading}>
            {loading ? "Generating..." : "Generate Insights"}
          </button>
        </div>
      </div>

      {error && <div className="text-red-600">{error}</div>}

      {insights.length > 0 && (
        <div className="space-y-3">
          {insights.map((i, idx) => (
            <div key={idx} className="border rounded p-3">
              <div className="text-xs uppercase text-gray-500 mb-1">{i.type}</div>
              <div>{i.text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
