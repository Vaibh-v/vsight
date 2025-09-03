import { useSession } from "next-auth/react";
import { useState } from "react";
import useSWR from "swr";
import { useAppState } from "../components/state/AppStateProvider";

type GbpLoc = { name: string; title?: string; websiteUri?: string };

export default function Connections() {
  const { data: session } = useSession();
  const { state, setState } = useAppState();
  const [gbpEnabled, setGbpEnabled] = useState(false);

  const { data: gbp, error: gbpErr, isLoading: gbpLoading } = useSWR(
    gbpEnabled ? "/api/google/gbp/locations" : null
  );

  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Connections</h1>

      {!session ? (
        <div className="p-4 border rounded bg-yellow-50">
          Please <span className="font-semibold">Sign in with Google</span> on the home page first.
        </div>
      ) : (
        <>
          {/* GA4 + GSC selections are already in your app.
              Keeping this section minimal and focusing on GBP add */}

          <section className="mt-6 p-4 border rounded">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Google Business Profile</h2>
              <button
                className="px-3 py-1 rounded bg-indigo-600 text-white"
                onClick={() => setGbpEnabled(true)}
                disabled={gbpEnabled || gbpLoading}
              >
                {gbpLoading ? "Loading..." : gbpEnabled ? "Loaded" : "Load Locations"}
              </button>
            </div>

            {gbpErr && (
              <p className="text-sm text-red-600 mt-2">
                {String(gbpErr)}. Ensure Business Profile APIs are enabled and you have access.
              </p>
            )}

            {gbp?.locations && (
              <div className="mt-3 grid gap-2">
                {(gbp.locations as GbpLoc[]).map((loc) => (
                  <button
                    key={loc.name}
                    className={`text-left p-3 border rounded hover:bg-gray-50 ${
                      state.gbpLocation?.name === loc.name ? "border-indigo-600" : ""
                    }`}
                    onClick={() => setState({ gbpLocation: loc })}
                  >
                    <div className="font-medium">{loc.title || loc.name}</div>
                    <div className="text-xs text-gray-500">{loc.websiteUri || "No website"}</div>
                  </button>
                ))}
              </div>
            )}

            {state.gbpLocation && (
              <div className="mt-3 text-sm text-gray-700">
                Selected: <span className="font-medium">{state.gbpLocation.title || state.gbpLocation.name}</span>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
