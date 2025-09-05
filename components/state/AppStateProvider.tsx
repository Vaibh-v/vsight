// components/state/AppStateProvider.tsx
import React, { createContext, useContext, useMemo, useState } from "react";

export type DatePreset = "last28d" | "last90d";

export type AppState = {
  // global selections
  datePreset: DatePreset;
  gaPropertyId?: string;
  gscSiteUrl?: string;
  gbpLocationName?: string;

  // room for future provider tokens / ids etc.
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
  gbpLocationName: undefined,
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
