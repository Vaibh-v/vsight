import { useAppState } from "./state/AppStateProvider";
import { lastNDays } from "../lib/http";

export default function DateControls() {
  const { state, setState } = useAppState();

  const handlePreset = (v: string) => {
    if (v !== "custom") return setState({ datePreset: v as any, startDate: undefined, endDate: undefined });
    // default custom to last 28d
    const { startDate, endDate } = lastNDays(28);
    setState({ datePreset: "custom", startDate, endDate });
  };

  return (
    <div className="flex gap-2 items-center">
      <select
        className="border rounded px-3 py-1"
        value={state.datePreset}
        onChange={(e) => handlePreset(e.target.value)}
      >
        <option value="last28d">Last 28 days</option>
        <option value="last60d">Last 60 days</option>
        <option value="last90d">Last 90 days</option>
        <option value="custom">Custom…</option>
      </select>

      {state.datePreset === "custom" && (
        <>
          <input
            type="date"
            className="border rounded px-2 py-1"
            value={state.startDate || ""}
            onChange={(e) => setState({ startDate: e.target.value })}
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            className="border rounded px-2 py-1"
            value={state.endDate || ""}
            onChange={(e) => setState({ endDate: e.target.value })}
          />
        </>
      )}
    </div>
  );
}
