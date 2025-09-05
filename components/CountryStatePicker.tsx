import { useAppState } from "./state/AppStateProvider";
import { COUNTRIES, REGIONS_BY_COUNTRY } from "../lib/locations";

export default function CountryStatePicker() {
  const { state, setState } = useAppState();
  const regions = REGIONS_BY_COUNTRY[state.country] || [];

  return (
    <div className="flex gap-2">
      <select
        className="border rounded px-3 py-1"
        value={state.country}
        onChange={(e) => setState({ country: e.target.value, region: undefined })}
      >
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>{c.name}</option>
        ))}
      </select>

      {/* Optional region */}
      <select
        className="border rounded px-3 py-1"
        value={state.region || ""}
        onChange={(e) => setState({ region: e.target.value || undefined })}
        disabled={!regions.length}
      >
        <option value="">All states / regions</option>
        {regions.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>
    </div>
  );
}
