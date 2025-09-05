import React, { createContext, useContext, useMemo, useState } from "react";

export type DatePreset = "last28d" | "last90d";

export type GbpLocation = {
  name: string;        // e.g. "accounts/123456789/locations/987654321"
  title?: string;      // e.g. "VSight HQ"
};

export type AppState = {
  // global selections
  datePreset: DatePreset;
  gaPropertyId?: string;
  gscSiteUrl?: string;

  // Country filter for GSC (ISO-3166-1 alpha-3 or "ALL")
  country?: string;    // "ALL" | "USA" | "IND" | ...

  // GBP selection (object, not just a string ID)
  gbpLocation?: GbpLocation;

  // room for future integrations
  // semrushKey?: string;
  // surferKey?: string;
  // claritySiteId?: string;
};

type Ctx = {
  state: AppState;
  setState: (patch: Partial<AppState> | ((prev: AppState) => Partial<AppState>)) => void;
};

const AppStateCtx = createContext<Ctx | null>(null);

const defaultState: AppState = {
  datePreset: "last28d",
  gaPropertyId: undefined,
  gscSiteUrl: undefined,
  country: "ALL",
  gbpLocation: undefined,
};

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, _set] = useState<AppState>(defaultState);

  const setState: Ctx["setState"] = (patch) => {
    _set((prev) => {
      const diff = typeof patch === "function" ? patch(prev) : patch;
      return { ...prev, ...diff };
    });
  };

  const value = useMemo<Ctx>(() => ({ state, setState }), [state]);
  return <AppStateCtx.Provider value={value}>{children}</AppStateCtx.Provider>;
}

export function useAppState(): Ctx {
  const ctx = useContext(AppStateCtx);
  if (!ctx) throw new Error("useAppState must be used within <AppStateProvider>");
  return ctx;
}
