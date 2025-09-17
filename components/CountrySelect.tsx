// /components/CountrySelect.tsx
import React from "react";

const countries = [
  { code: "", name: "All countries" },
  { code: "US", name: "United States" },
  { code: "IN", name: "India" },
  // add more as needed
];

export default function CountrySelect({
  value,
  onChange,
}: {
  value?: string;
  onChange: (v: string | undefined) => void;
}) {
  return (
    <select
      className="border rounded px-2 py-1 w-full"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || undefined)}
    >
      {countries.map((c) => (
        <option key={c.code} value={c.code}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
