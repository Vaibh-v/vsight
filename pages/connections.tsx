import useSWR from "swr";
import { useAppState } from "../components/state/AppStateProvider";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ConnectionsPage() {
  const { gaPropertyId, gscSiteUrl, gbpLocationName, setState } = useAppState();

  const { data: ga, error: gaErr, isLoading: gaLoading } = useSWR("/api/google/ga/properties", fetcher);
  const { data: gsc, error: gscErr, isLoading: gscLoading } = useSWR("/api/google/gsc/sites", fetcher);
  const { data: gbp, error: gbpErr, isLoading: gbpLoading } = useSWR("/api/gbp/locations", fetcher);

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-8">
      <h1 className="text-2xl font-semibold">Connections</h1>

      {/* GA4 */}
      <div className="border rounded-lg p-4">
        <div className="font-medium mb-2">Google Analytics 4</div>
        {gaErr && <p className="text-red-600 text-sm">GA error: {String(gaErr.message || gaErr.error || gaErr)}</p>}
        <select
          disabled={gaLoading || gaErr}
          className="border rounded p-2 w-full"
          value={gaPropertyId || ""}
          onChange={(e) => setState({ gaPropertyId: e.target.value })}
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
          disabled={gscLoading || gscErr}
          className="border rounded p-2 w-full"
          value={gscSiteUrl || ""}
          onChange={(e) => setState({ gscSiteUrl: e.target.value })}
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
          disabled={gbpLoading || gbpErr}
          className="border rounded p-2 w-full"
          value={gbpLocationName || ""}
          onChange={(e) => setState({ gbpLocationName: e.target.value })}
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
