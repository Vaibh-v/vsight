export default function Kpi({
  label,
  value,
  delta
}: {
  label: string;
  value: string | number;
  delta?: number; // percent vs previous
}) {
  const trend =
    typeof delta === "number"
      ? delta > 0
        ? { color: "text-green-600", sign: "+" }
        : delta < 0
        ? { color: "text-red-600", sign: "" }
        : { color: "text-gray-500", sign: "" }
      : null;

  return (
    <div className="rounded-lg border p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {trend && (
        <div className={`text-xs mt-1 ${trend.color}`}>
          {trend.sign}
          {delta?.toFixed(1)}%
        </div>
      )}
    </div>
  );
}
