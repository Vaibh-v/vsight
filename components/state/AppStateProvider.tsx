import React, { createContext, useContext, useMemo, useState, useEffect } from "react";

export type DatePreset = "last28d" | "last60d" | "last90d" | "custom";

export type AppState = {
  // Connections / selections
  gaPropertyId?: string;
  gscSiteUrl?: string;
  gbpLocationName?: string;

  // Date / region
  datePreset: DatePreset;
  startDate?: string; // ISO yyyy-mm-dd (when preset=custom)
  endDate?: string;
  country: string;    // ISO-3166 alpha-2 or "ALL"
  region?: string;    // state/province optional (free text from dropdown)

  // UI
  aiPanelOpen: boolean;
};

type Ctx = {
  state: AppState;
  setState: (patch: Partial<AppState> | ((prev: AppState) => Partial<AppState>)) => void;
};

const AppStateCtx = createContext<Ctx | null>(null);

const DEFAULT_STATE: AppState = {
  datePreset: "last28d",
  country: "ALL",
  aiPanelOpen: true
};

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, _set] = useState<AppState>(() => {
    if (typeof window === "undefined") return DEFAULT_STATE;
    try {
      const raw = localStorage.getItem("vsight/appState");
      return raw ? { ...DEFAULT_STATE, ...JSON.parse(raw) } : DEFAULT_STATE;
    } catch {
      return DEFAULT_STATE;
    }
  });

  const setState: Ctx["setState"] = (patch) => {
    _set((prev) => {
      const diff = typeof patch === "function" ? patch(prev) : patch;
      return { ...prev, ...diff };
    });
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("vsight/appState", JSON.stringify(state));
    }
  }, [state]);

  const value = useMemo<Ctx>(() => ({ state, setState }), [state]);
  return <AppStateCtx.Provider value={value}>{children}</AppStateCtx.Provider>;
}

export function useAppState(): Ctx {
  const ctx = useContext(AppStateCtx);
  if (!ctx) throw new Error("useAppState must be used within <AppStateProvider>");
  return ctx;
}
