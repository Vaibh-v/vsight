import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type DatePreset = "last28d" | "last90d";
export type AppState = {
  gaPropertyId?: string | null;
  gscSiteUrl?: string | null;
  gbpLocation?: { name: string; title?: string; websiteUri?: string } | null;
  country?: string; // ISO country code for GSC (e.g., "ALL", "USA", "IND")
  datePreset: DatePreset;
};
type Ctx = {
  state: AppState;
  setState: (patch: Partial<AppState>) => void;
  reset: () => void;
};
const AppStateCtx = createContext<Ctx | null>(null);

const KEY = "vsight.app.state.v1";

const defaultState: AppState = {
  gaPropertyId: null,
  gscSiteUrl: null,
  gbpLocation: null,
  country: "ALL",
  datePreset: "last90d"
};

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setStateInner] = useState<AppState>(defaultState);

  // load once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setStateInner({ ...defaultState, ...JSON.parse(raw) });
    } catch {}
  }, []);

  const setState = (patch: Partial<AppState>) => {
    setStateInner((s) => {
      const next = { ...s, ...patch };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const reset = () => {
    setStateInner(defaultState);
    try {
      localStorage.removeItem(KEY);
    } catch {}
  };

  const value = useMemo(() => ({ state, setState, reset }), [state]);

  return <AppStateCtx.Provider value={value}>{children}</AppStateCtx.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateCtx);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
