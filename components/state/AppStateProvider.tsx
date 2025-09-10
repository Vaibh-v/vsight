import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type DateRange = { start: string; end: string };
export type Region = { country: string; state?: string };
export type GBPSelection = { name: string; title?: string } | null;

export type Selections = {
  ga4PropertyId?: string;
  gscSiteUrl?: string;
  gbpLocation?: GBPSelection;
  dateRange?: DateRange;
  region?: Region; // canonical country/state holder
};

// ---- Legacy shape expected by older components ----
// They previously did: const { state, setState } = useAppState()
type LegacyState = {
  // Dates (old code sometimes uses startDate/endDate and/or datePreset)
  startDate?: string;
  endDate?: string;
  datePreset?: string;

  // Country/state were flat before; now they live under region
  country?: string;
  state?: string;

  // Some components might directly stash IDs here; keep passthrough
  ga4PropertyId?: string;
  gscSiteUrl?: string;

  // Allow anything else for safety
  [key: string]: any;
};

// The context type we expose
type Ctx = {
  // New API (canonical)
  ga4PropertyId?: string;
  gscSiteUrl?: string;
  gbpLocation?: GBPSelection;
  dateRange?: DateRange | null;
  region?: Region | null;
  setSelections: (patch: Partial<Selections> | any) => void;

  // Legacy API (shim)
  state: LegacyState;
  setState: (patch: Partial<LegacyState>) => void;
};

const AppStateContext = createContext<Ctx | null>(null);

const LS_KEY = "vsight.selections.v1";

/** Normalize possible {startDate,endDate} into {start,end}. */
function normalizeDateRange(dr: any | undefined): DateRange | undefined {
  if (!dr) return undefined;
  if (typeof dr !== "object") return undefined;
  const hasStartEnd = "start" in dr || "end" in dr;
  const hasStartDateEndDate = "startDate" in dr || "endDate" in dr;

  if (hasStartEnd) {
    return {
      start: String(dr.start ?? ""),
      end: String(dr.end ?? ""),
    };
  }
  if (hasStartDateEndDate) {
    return {
      start: String(dr.startDate ?? ""),
      end: String(dr.endDate ?? ""),
    };
  }
  return undefined;
}

// ---------- Storage helpers ----------
function loadFromStorage(): Selections {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as any;

    // Normalize any legacy dateRange shape on load
    if (parsed?.dateRange) {
      const nr = normalizeDateRange(parsed.dateRange);
      if (nr) parsed.dateRange = nr;
      else delete parsed.dateRange;
    }

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
    // ignore
  }
}

// ---------- Provider ----------
export function AppStateProvider({ children }: { children: React.ReactNode }) {
  // canonical selections (new API)
  const [sel, setSel] = useState<Selections>({
    region: { country: "USA" }, // default country
  });

  // hydrate once on client
  useEffect(() => {
    const initial = loadFromStorage();
    setSel((prev) => ({
      region: { country: "USA", ...(prev.region || {}), ...(initial.region || {}) },
      ...prev,
      ...initial,
    }));
  }, []);

  // canonical setter (accepts either {start,end} or {startDate,endDate})
  const setSelections = (patch: Partial<Selections> | any) => {
    // Normalize incoming dateRange if it uses legacy keys
    let normalizedPatch: Partial<Selections> = { ...patch };
    if (patch?.dateRange) {
      const nr = normalizeDateRange(patch.dateRange);
      if (nr) normalizedPatch.dateRange = nr;
      else delete (normalizedPatch as any).dateRange; // avoid bad shapes
    }

    setSel((prev) => {
      const nextRegion =
        normalizedPatch.region !== undefined
          ? { ...(prev.region || {}), ...(normalizedPatch.region || {}) }
          : prev.region;

      const next: Selections = { ...prev, ...normalizedPatch, region: nextRegion };
      saveToStorage(next);
      return next;
    });
  };

  // ---------- Legacy adapter ----------
  // Derive a legacy-style object from canonical selections so old components keep working.
  const legacyState: LegacyState = useMemo(() => {
    const startDate = sel.dateRange?.start;
    const endDate = sel.dateRange?.end;
    const country = sel.region?.country;
    const st = sel.region?.state;

    return {
      startDate,
      endDate,
      // We don’t attempt to re-derive which named preset was used; old code can keep a label if needed.
      datePreset: undefined,
      country,
      state: st,
      ga4PropertyId: sel.ga4PropertyId,
      gscSiteUrl: sel.gscSiteUrl,
    };
  }, [sel]);

  // Translate legacy patches into canonical selections.
  const setState = (patch: Partial<LegacyState>) => {
    setSel((prev) => {
      let next: Selections = { ...prev };

      // Date handling (legacy keys)
      const nextStart = patch.startDate ?? prev.dateRange?.start;
      const nextEnd = patch.endDate ?? prev.dateRange?.end;
      if (nextStart || nextEnd) {
        next.dateRange = {
          start: nextStart || prev.dateRange?.start || "",
          end: nextEnd || prev.dateRange?.end || "",
        };
      }

      // Country/state handling
      if (patch.country !== undefined || patch.state !== undefined) {
        next.region = {
          country: patch.country ?? prev.region?.country ?? "USA",
          state: patch.state ?? prev.region?.state,
        };
      }

      // Direct IDs (pass-through)
      if (patch.ga4PropertyId !== undefined) next.ga4PropertyId = patch.ga4PropertyId;
      if (patch.gscSiteUrl !== undefined) next.gscSiteUrl = patch.gscSiteUrl;

      saveToStorage(next);
      return next;
    });
  };

  const value: Ctx = useMemo(
    () => ({
      // new API
      ga4PropertyId: sel.ga4PropertyId,
      gscSiteUrl: sel.gscSiteUrl,
      gbpLocation: sel.gbpLocation ?? null,
      dateRange: sel.dateRange ?? null,
      region: sel.region ?? null,
      setSelections,

      // legacy API (shim)
      state: legacyState,
      setState,
    }),
    [sel, legacyState]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): Ctx {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within <AppStateProvider>");
  return ctx;
}
