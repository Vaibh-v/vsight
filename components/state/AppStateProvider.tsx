import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type DateRange = { start: string; end: string };
export type Region = { country: string; state?: string };
export type GBPSelection = { name: string; title?: string } | null;

export type Selections = {
  ga4PropertyId?: string;
  gscSiteUrl?: string;
  gbpLocation?: GBPSelection;
  dateRange?: DateRange;
  region?: Region; // <— NEW: single “region” object for country/state
};

type Ctx = {
  ga4PropertyId?: string;
  gscSiteUrl?: string;
  gbpLocation?: GBPSelection;
  dateRange?: DateRange | null;
  region?: Region | null;
  setSelections: (patch: Partial<Selections>) => void;
};

const AppStateContext = createContext<Ctx | null>(null);

const LS_KEY = "vsight.selections.v1";

function loadFromStorage(): Selections {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === "object" ? parsed : {}) as Selections;
  } catch {
    return {};
  }
}

function saveToStorage(sel: Selections) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LS_KEY, JSON.stringify(sel));
    }
  } catch {
    // ignore storage failures silently
  }
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  // You can set a default country here if you like:
  const [state, setState] = useState<Selections>({ region: { country: "USA" } });

  // hydrate once on client
  useEffect(() => {
    const initial = loadFromStorage();
    // merge with default region if missing
    setState(prev => ({ region: { country: "USA" }, ...prev, ...initial }));
  }, []);

  const setSelections = (patch: Partial<Selections>) => {
    setState(prev => {
      // if patch contains a partial region, merge it safely
      const nextRegion =
        patch.region !== undefined
          ? { ...(prev.region || {}), ...(patch.region || {}) }
          : prev.region;

      const next: Selections = { ...prev, ...patch, region: nextRegion };
      saveToStorage(next);
      return next;
    });
  };

  const value = useMemo<Ctx>(
    () => ({
      ga4PropertyId: state.ga4PropertyId,
      gscSiteUrl: state.gscSiteUrl,
      gbpLocation: state.gbpLocation ?? null,
      dateRange: state.dateRange ?? null,
      region: state.region ?? null,
      setSelections,
    }),
    [state]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): Ctx {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within <AppStateProvider>");
  return ctx;
}
