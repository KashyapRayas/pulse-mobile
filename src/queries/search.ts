// Metric search's index (pulse src/server/queries/search.ts): every My Dashboard metric with its value on the day and
// the mean and spread of the 30 days before it, so a result shows where it stands without opening it. Read-only.
import { DASHBOARD_METRICS, type DashboardGroup, type DashboardKey } from "@/lib/dashboard";
import type { QueryCtx } from "./ctx";
import { getHomeDashboard } from "./homeExtras";
import type { KeyStat } from "./types";

export type SearchMetric = KeyStat & { group: DashboardGroup };
export type SearchIndex = { day: string; today: string; metrics: SearchMetric[] };

/** Stress Monitor is a page (search lists it under Pages); the rest are numbers. */
export const SEARCHABLE = DASHBOARD_METRICS.filter((m) => m.key !== "stress");

export async function getSearchIndex(day: string, ctx: QueryCtx): Promise<SearchIndex> {
  const keys = SEARCHABLE.map((m) => m.key) as DashboardKey[];
  const groups = new Map(SEARCHABLE.map((m) => [m.key as string, m.group]));
  const { keyStats } = await getHomeDashboard(day, ctx, keys);
  return { day, today: ctx.today, metrics: keyStats.map((s) => ({ ...s, group: groups.get(s.key)! })) };
}
