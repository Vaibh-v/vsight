import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type DateRange = { start: string; end: string };

export type GBPSelection = { name: string; title?: string } | null;

export type Selections = {
  ga4PropertyId?: string;
  gscSiteUrl?: string;
  gbpLocation?: GBPSelection;
  dateRange?: DateRange;
};

type Ctx = {
  ga4PropertyId?: string;
  gscSiteUrl?: string;
  gbpLocation?: GBPSelection;
  dateRange?: DateRange | null;
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
    if (parsed && typeof parsed === "object") return parsed as Selections;
    return {};
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
    // ignore
  }
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Selections>({});

  // hydrate once on client
  useEffect(() => {
    const initial = loadFromStorage();
    setState(initial);
  }, []);

  const setSelections = (patch: Partial<Selections>) => {
    setState(prev => {
      const next = { ...prev, ...patch };
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
      setSelections,
    }),
    [state]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): Ctx {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error("useAppState must be used within <AppStateProvider>");
  }
  return ctx;
}
