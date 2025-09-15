import * as React from "react";

type Props = {
  value?: string;
  onChange: (val: string) => void;
  placeholder?: string;
};

type GscSite = { siteUrl: string; permissionLevel?: string };

export default function GSCSitePicker({
  value = "",
  onChange,
  placeholder = "Select a GSC property…",
}: Props) {
  const [sites, setSites] = React.useState<GscSite[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const r = await fetch("/api/google/gsc/sites");
        const j = await r.json();
        if (!r.ok) throw new Error(j?.error || "Failed to load GSC sites");
        if (mounted) setSites(Array.isArray(j) ? j : j?.siteEntry ?? []);
      } catch (e: any) {
        if (mounted) setError(e?.message || "Failed to load GSC sites");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="w-full">
      <select
        className="w-full border rounded px-3 py-2 bg-white"
        disabled={loading || !!error}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{loading ? "Loading GSC sites…" : placeholder}</option>
        {error ? (
          <option value="" disabled>
            {error}
          </option>
        ) : (
          sites
            .sort((a, b) => a.siteUrl.localeCompare(b.siteUrl))
            .map((s) => (
              <option key={s.siteUrl} value={s.siteUrl}>
                {s.siteUrl}
              </option>
            ))
        )}
      </select>
    </div>
  );
}
