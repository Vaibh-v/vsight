import type { Integration } from "./types";
import { ga4 } from "../google/ga4";
import { gsc } from "../google/gsc";
import { clarity } from "../microsoft/clarity";
import { semrush } from "../semrush/client";
import { ahrefs } from "../ahrefs/client";

const REGISTRY: Record<string, Integration> = {
  ga4,
  gsc,
  clarity,
  semrush,
  ahrefs,
};

export function listIntegrations() {
  return Object.values(REGISTRY).map(({ id, label, ops }) => ({ id, label, ops }));
}

export function getIntegration(id: string): Integration | undefined {
  return REGISTRY[id];
}
