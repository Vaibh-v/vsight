import React, { createContext, useContext, useEffect, useState } from "react";
type DateRange = { start: string; end: string };
type Ctx = { ga4PropertyId?: string; gscSiteUrl?: string; dateRange?: DateRange; setSelections: (u: Partial<Ctx>) => void; reset: () => void; };
const STORAGE_KEY = "vsight:selections:v1";
const AppCtx = createContext<Ctx | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Ctx>({ setSelections: () => {}, reset: () => {} } as any);

  useEffect(() => { if (typeof window === "undefined") return; const raw = localStorage.getItem(STORAGE_KEY); if (raw) { try { setState((p) => ({ ...p, ...JSON.parse(raw) })); } catch {} } }, []);
  useEffect(() => { if (typeof window === "undefined") return; const { ga4PropertyId, gscSiteUrl, dateRange } = state; localStorage.setItem(STORAGE_KEY, JSON.stringify({ ga4PropertyId, gscSiteUrl, dateRange })); }, [state.ga4PropertyId, state.gscSiteUrl, state.dateRange]);

  const setSelections = (u: Partial<Ctx>) => setState((p) => ({ ...p, ...u }));
  const reset = () => setState({ ga4PropertyId: undefined, gscSiteUrl: undefined, dateRange: undefined, setSelections, reset });
  return <AppCtx.Provider value={{ ...state, setSelections, reset }}>{children}</AppCtx.Provider>;
}
export function useAppState() { const v = useContext(AppCtx); if (!v) throw new Error("useAppState must be used inside AppStateProvider"); return v; }
