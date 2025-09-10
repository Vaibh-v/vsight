import { useAppState } from "./state/AppStateProvider";

const COUNTRIES = [
  { code: "USA", label: "USA" },
  { code: "IND", label: "India" },
  { code: "GBR", label: "UK" },
  { code: "AUS", label: "Australia" },
  { code: "CAN", label: "Canada" },
];

export default function CountryStatePicker() {
  const { region, setSelections } = useAppState();
  const country = region?.country || "USA";
  const state = region?.state || "";

  return (
    <div className="flex items-center gap-2">
      <select
        className="border rounded px-2 py-1"
        value={country}
        onChange={(e) => setSelections({ region: { country: e.target.value } })}
      >
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.label}
          </option>
        ))}
      </select>

      <input
        className="border rounded px-2 py-1"
        placeholder="State/Region (optional)"
        value={state}
        onChange={(e) => setSelections({ region: { country, state: e.target.value } })}
      />
    </div>
  );
}
