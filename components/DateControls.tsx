// components/DateControls.tsx
import React from "react";
import { useAppState } from "./state/AppStateProvider";

type Preset = "last_7_days" | "last_28_days" | "last_90_days" | "custom";

export default function DateControls() {
  const { selections, updateSelections } = useAppState();

  const preset: Preset = (selections.datePreset as Preset) ?? "last_28_days";
  const startDate = selections.startDate ?? "";
  const endDate = selections.endDate ?? "";

  const handlePreset = (v: Preset) => {
    // When switching to a non-custom preset, clear explicit dates.
    if (v !== "custom") {
      updateSelections({ datePreset: v, startDate: undefined, endDate: undefined });
    } else {
      updateSelections({ datePreset: v });
    }
  };

  const handleStart = (v: string) => {
    updateSelections({ startDate: v || undefined, datePreset: "custom" });
  };

  const handleEnd = (v: string) => {
    updateSelections({ endDate: v || undefined, datePreset: "custom" });
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      {/* Preset selector */}
      <div className="flex flex-col">
        <label className="text-sm mb-1">Date range</label>
        <select
          className="border rounded px-3 py-2 min-w-[200px]"
          value={preset}
          onChange={(e) => handlePreset(e.target.value as Preset)}
        >
          <option value="last_7_days">Last 7 days</option>
          <option value="last_28_days">Last 28 days</option>
          <option value="last_90_days">Last 90 days</option>
          <option value="custom">Custom…</option>
        </select>
      </div>

      {/* Custom dates (enabled when preset is custom) */}
      <div className="flex gap-3">
        <div className="flex flex-col">
          <label className="text-sm mb-1">Start</label>
          <input
            type="date"
            className="border rounded px-3 py-2"
            value={startDate}
            onChange={(e) => handleStart(e.target.value)}
            disabled={preset !== "custom"}
          />
        </div>

        <div className="flex flex-col">
          <label className="text-sm mb-1">End</label>
          <input
            type="date"
            className="border rounded px-3 py-2"
            value={endDate}
            onChange={(e) => handleEnd(e.target.value)}
            disabled={preset !== "custom"}
          />
        </div>
      </div>
    </div>
  );
}
