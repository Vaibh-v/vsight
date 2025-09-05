// pages/connections.tsx
import useSWR from "swr";
import { useAppState } from "../components/state/AppStateProvider";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ConnectionsPage() {
  const { state, setState } = useAppState();
  const { gaPropertyId, gscSiteUrl, gbpLocation } = state;

  // API calls
  const { data: ga,  error: gaErr,  isLoading: gaLoading  } = useSWR("/api/google/ga/properties", fetcher);
  const { data: gsc, error: gscErr, isLoading: gscLoading } = useSWR("/api/google/gsc/sites", fetcher);
  const { data: gbp, error: gbpErr, isLoading: gbpLoading } = useSWR("/api/gbp/locations", fetcher);
  // If your GBP route actually lives under /api/google/gbp/locations, change the path above to match.

  // Helpers to set selections
  const onSelectGA = (value: string) => setState({ gaPropertyId: value || undefined });
  const onSelectGSC = (value: string) => setState({ gscSiteUrl: value || undefined });
  const onSelectGBP = (value: string) => {
    const chosen = (gbp?.locations || []).find((l: any) => l.name === value);
    setState({ gbpLocation: chosen ? { name: chosen.name, title: chosen.title } : undefined });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-8">
      <h1 className="text-2xl font-semibold">Connections</h1>

      {/* GA4 */}
      <div className="border rounded-lg p-4">
        <div className="font-medium mb-2">Google Analytics 4</div>
        {gaErr && <p className="text-red-600 text-sm">GA error: {String(gaErr.message || gaErr.error || gaErr)}</p>}
        <select
          disabled={gaLoading || !!gaErr}
          className="border rounded p-2 w-full"
          value={gaPropertyId || ""}
          onChange={(e) => onSelectGA(e.target.value)}
        >
          <option value="">Select a property</option>
          {(ga?.properties || []).map((p: any) => (
            <option key={p.propertyId} value={p.propertyId}>
              {p.displayName} (prop {p.propertyId})
            </option>
          ))}
        </select>
      </div>

      {/* GSC */}
      <div className="border rounded-lg p-4">
        <div className="font-medium mb-2">Google Search Console</div>
        {gscErr && <p className="text-red-600 text-sm">GSC error: {String(gscErr.message || gscErr.error || gscErr)}</p>}
        <select
          disabled={gscLoading || !!gscErr}
          className="border rounded p-2 w-full"
          value={gscSiteUrl || ""}
          onChange={(e) => onSelectGSC(e.target.value)}
        >
          <option value="">Select a site</option>
          {(gsc?.sites || []).map((s: any) => (
            <option key={s.siteUrl} value={s.siteUrl}>
              {s.siteUrl}
            </option>
          ))}
        </select>
      </div>

      {/* GBP */}
      <div className="border rounded-lg p-4">
        <div className="font-medium mb-2">Google Business Profile</div>
        {gbpErr && (
          <p className="text-red-600 text-sm">
            GBP error: {String(gbpErr.message || gbpErr.error || gbpErr)} (Enable Business Profile APIs & scopes)
          </p>
        )}
        <select
          disabled={gbpLoading || !!gbpErr}
          className="border rounded p-2 w-full"
          value={gbpLocation?.name || ""}
          onChange={(e) => onSelectGBP(e.target.value)}
        >
          <option value="">Select a location</option>
          {(gbp?.locations || []).map((l: any) => (
            <option key={l.name} value={l.name}>
              {l.title}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
