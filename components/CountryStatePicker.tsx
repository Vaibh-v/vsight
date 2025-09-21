// components/CountryStatePicker.tsx
import React from "react";
import { useAppState } from "./state/AppStateProvider";

export default function CountryStatePicker() {
  const { selections, updateSelections } = useAppState();
  const country = selections.region?.country ?? "";
  const st = selections.region?.state ?? "";

  const onCountryChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    updateSelections({ region: { country: e.target.value, state: st ?? undefined } });
  };

  const onStateChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const nextState = e.target.value || undefined;
    updateSelections({ region: { country: country ?? "", state: nextState } });
  };

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {/* Country */}
      <div className="flex flex-col">
        <label className="text-sm mb-1">Country</label>
        {/* Use a text input to avoid shipping a long country list; swap to a Select later */}
        <input
          className="border rounded px-3 py-2"
          placeholder="e.g. US"
          value={country}
          onChange={onCountryChange}
          aria-label="Country code"
        />
        <p className="text-xs text-gray-500 mt-1">ISO 3166-1 alpha-2, e.g., US, GB, IN.</p>
      </div>

      {/* State/Region (optional) */}
      <div className="flex flex-col">
        <label className="text-sm mb-1">State/Region (optional)</label>
        <input
          className="border rounded px-3 py-2"
          placeholder="e.g. CA"
          value={st ?? ""}
          onChange={onStateChange}
          aria-label="State or region code"
        />
      </div>
    </div>
  );
}
