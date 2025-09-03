import { useEffect, useState } from "react";

export default function RightRailAI() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "ai"; content: string }[]>([
    { role: "ai", content: "Hi! I can summarize your KPIs or explain changes. Try: Why did clicks drop last 7d?" }
  ]);
  const [loading, setLoading] = useState(false);

  async function ask() {
    if (!input.trim()) return;
    const q = input.trim();
    setMessages((m) => [...m, { role: "user", content: q }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/ai/ask", { method: "POST", body: JSON.stringify({ prompt: q }) });
      const json = await res.json();
      setMessages((m) => [...m, { role: "ai", content: json.text || "No answer." }]);
    } catch (e: any) {
      setMessages((m) => [...m, { role: "ai", content: `Error: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <aside className="w-full md:w-80 border rounded p-3 h-fit sticky top-4">
      <div className="font-semibold mb-2">AI Insight</div>
      <div className="space-y-2 max-h-80 overflow-auto text-sm">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "ai" ? "text-gray-800" : "text-indigo-700"}>
            <b>{m.role === "ai" ? "AI:" : "You:"}</b> {m.content}
          </div>
        ))}
        {loading && <div className="text-xs text-gray-500">Thinking…</div>}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          className="flex-1 border rounded px-2 py-1 text-sm"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question…"
        />
        <button className="px-3 py-1 rounded bg-black text-white text-sm" onClick={ask} disabled={loading}>
          Ask
        </button>
      </div>
    </aside>
  );
}
