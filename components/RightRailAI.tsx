import React, { useState } from "react";

export default function RightRailAI() {
  const [q, setQ] = useState("");
  const [a, setA] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function ask() {
    setBusy(true);
    setA(null);
    try {
      const r = await fetch("/api/ai/ask", { method: "POST", body: JSON.stringify({ query: q }) });
      const j = await r.json();
      setA(j.answer ?? "No answer.");
    } catch (e: any) {
      setA(`Error: ${e.message || e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="fixed right-4 top-24 w-[360px] max-h-[80vh] overflow-auto bg-white/90 backdrop-blur border rounded-xl shadow p-4 hidden xl:block">
      <div className="font-semibold mb-2">AI Insight</div>
      <textarea
        className="w-full border rounded p-2 mb-2"
        rows={4}
        placeholder="Ask about your metrics…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <button onClick={ask} disabled={busy} className="px-3 py-2 rounded bg-black text-white text-sm">
        {busy ? "Thinking…" : "Ask"}
      </button>
      {a && <div className="mt-3 text-sm whitespace-pre-wrap">{a}</div>}
      {!a && !q && (
        <div className="text-xs text-neutral-600 mt-3">
          Try: “What were the top 5 queries this month vs last?” or “Which pages lost clicks last 28 days?”
        </div>
      )}
    </aside>
  );
}
