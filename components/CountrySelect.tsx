// components/CountrySelect.tsx
"use client";

type Props = {
  value?: string;
  onChange: (v: string | undefined) => void;
  className?: string;
};

const COUNTRIES = [
  { code: "", name: "All countries" },
  { code: "COUNTRY_US", name: "United States" },
  { code: "COUNTRY_IN", name: "India" },
  { code: "COUNTRY_GB", name: "United Kingdom" },
  { code: "COUNTRY_AU", name: "Australia" },
  { code: "COUNTRY_CA", name: "Canada" },
];

export default function CountrySelect({ value, onChange, className }: Props) {
  return (
    <select
      className={className || "border rounded px-2 py-1 w-full"}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || undefined)}
    >
      {COUNTRIES.map(c => (
        <option key={c.code || "ALL"} value={c.code}>{c.name}</option>
      ))}
    </select>
  );
}
