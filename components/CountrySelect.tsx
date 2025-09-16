import React from "react";

type Props = {
  /** e.g. "COUNTRY_US". Empty/undefined = all countries */
  value?: string;
  onChange: (v: string | undefined) => void;
  className?: string;
  disabled?: boolean;
};

const OPTIONS: Array<{ code: string; label: string }> = [
  { code: "", label: "All countries" },
  { code: "COUNTRY_US", label: "United States" },
  { code: "COUNTRY_IN", label: "India" },
  { code: "COUNTRY_GB", label: "United Kingdom" },
  { code: "COUNTRY_CA", label: "Canada" },
  { code: "COUNTRY_AU", label: "Australia" },
  { code: "COUNTRY_SG", label: "Singapore" },
  { code: "COUNTRY_AE", label: "United Arab Emirates" },
  { code: "COUNTRY_IE", label: "Ireland" },
  { code: "COUNTRY_DE", label: "Germany" },
  { code: "COUNTRY_FR", label: "France" },
  { code: "COUNTRY_ES", label: "Spain" },
  { code: "COUNTRY_IT", label: "Italy" },
  { code: "COUNTRY_NL", label: "Netherlands" },
  { code: "COUNTRY_SE", label: "Sweden" },
  { code: "COUNTRY_NO", label: "Norway" },
  { code: "COUNTRY_DK", label: "Denmark" },
  { code: "COUNTRY_CH", label: "Switzerland" },
  { code: "COUNTRY_BE", label: "Belgium" },
  { code: "COUNTRY_PL", label: "Poland" },
  { code: "COUNTRY_PT", label: "Portugal" },
  { code: "COUNTRY_GR", label: "Greece" },
  { code: "COUNTRY_IL", label: "Israel" },
  { code: "COUNTRY_TR", label: "Türkiye" },
  { code: "COUNTRY_JP", label: "Japan" },
  { code: "COUNTRY_KR", label: "South Korea" },
  { code: "COUNTRY_HK", label: "Hong Kong" },
  { code: "COUNTRY_TW", label: "Taiwan" },
  { code: "COUNTRY_TH", label: "Thailand" },
  { code: "COUNTRY_MY", label: "Malaysia" },
  { code: "COUNTRY_PH", label: "Philippines" },
  { code: "COUNTRY_ID", label: "Indonesia" },
  { code: "COUNTRY_VN", label: "Vietnam" },
  { code: "COUNTRY_NZ", label: "New Zealand" },
  { code: "COUNTRY_MX", label: "Mexico" },
  { code: "COUNTRY_BR", label: "Brazil" },
  { code: "COUNTRY_AR", label: "Argentina" },
  { code: "COUNTRY_CL", label: "Chile" },
  { code: "COUNTRY_CO", label: "Colombia" },
  { code: "COUNTRY_ZA", label: "South Africa" },
  { code: "COUNTRY_EG", label: "Egypt" },
  { code: "COUNTRY_SA", label: "Saudi Arabia" },
  { code: "COUNTRY_QA", label: "Qatar" },
  { code: "COUNTRY_KW", label: "Kuwait" },
];

export default function CountrySelect({ value, onChange, className, disabled }: Props) {
  return (
    <select
      className={
        className ??
        "w-full h-10 rounded-md border border-gray-300 bg-white px-3 text-sm"
      }
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || undefined)}
      disabled={disabled}
    >
      {OPTIONS.map((o) => (
        <option key={o.code || "ALL"} value={o.code}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
