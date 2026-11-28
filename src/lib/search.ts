// Metric search (pulse src/components/shells/CommandMenu.tsx, Linear's search): the ranking, the extra words each
// metric answers to, the pages the search lists and the metric a route shows (for "Recent"). Pure; no copy here: labels
// are resolved by the caller (src/screens/search/SearchScreen.tsx).
import type { DashboardGroup } from "./dashboard";

/**
 * Extra words a metric answers to, beside its name ("rhr", "spo2"). Abbreviations and English synonyms: every language
 * searches the translated name first, and these still match the short forms people type.
 */
export const METRIC_WORDS: Record<string, string> = {
  hrv: "hrv variability",
  rhr: "rhr resting heart rate pulse",
  resp: "breathing respiration",
  spo2: "spo2 oxygen saturation",
  skin: "temperature skin temp",
  sleep: "sleep performance score",
  recovery: "readiness charge",
  strain: "effort load",
  vo2max: "vo2 cardio fitness",
  hours: "sleep duration time asleep",
  debt: "sleep debt",
  consistency: "sleep schedule regularity",
  calories: "energy burn kcal",
  steps: "walking",
  weight: "mass",
  body_fat: "fat percentage",
  lean_mass: "lean muscle",
};

/** Lower case, without accents, so "fréquence" finds "frequence" and the other way round. */
export const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** Every word of the query appears in `hay`. */
export function matchesAll(hay: string, query: string) {
  const h = fold(hay);
  return fold(query).split(/\s+/).filter(Boolean).every((w) => h.includes(w));
}

/**
 * Metrics for a query, best first: the name starting with it, then the name holding every word, then a synonym. A
 * category name ("vitals") matches only when nothing matched by name, so "sleep" lists the sleep metrics and not every
 * metric filed under "Recovery & sleep". Ties keep the pool's order.
 */
export function rankMetrics<T extends { key: string; label: string; group: DashboardGroup }>(pool: readonly T[], query: string, groupLabel: (g: DashboardGroup) => string): T[] {
  const q = query.trim();
  if (!q) return [...pool];
  const score = (m: T) => {
    if (fold(m.label).startsWith(fold(q))) return 3;
    if (matchesAll(m.label, q)) return 2;
    if (matchesAll(`${m.key.replace(/_/g, " ")} ${METRIC_WORDS[m.key] ?? ""}`, q)) return 1;
    return 0;
  };
  const ranked = pool.map((m, i) => ({ m, i, s: score(m) })).filter((x) => x.s > 0);
  if (ranked.length) return ranked.sort((a, b) => b.s - a.s || a.i - b.i).map((x) => x.m);
  return pool.filter((m) => matchesAll(groupLabel(m.group), q));
}

/** The metric a route shows, for "Recent": `/metric/hrv`, `/trend/steps` and the three score screens. */
export function metricOfPath(pathname: string): string | null {
  const m = /^\/(?:metric|trend)\/([a-z0-9_]+)$/.exec(pathname);
  if (m) return m[1];
  return ({ "/recovery": "recovery", "/sleep": "sleep", "/strain": "strain" } as Record<string, string>)[pathname] ?? null;
}

/** How far a value sits from its usual, in standard deviations; 0 without a value, an average or a spread. */
export function offBy(m: { metric: { value: number | null }; average: number | null; sd?: number }): number {
  const v = m.metric.value;
  if (v === null || m.average === null || !m.sd) return 0;
  return Math.abs(v - m.average) / m.sd;
}

/** "Off your usual": the metrics 1.5 SD or more from their mean, furthest first, up to `max`, skipping `skip`. */
export function offUsual<T extends { key: string; metric: { value: number | null }; average: number | null; sd?: number }>(metrics: readonly T[], skip: readonly string[] = [], max = 4): T[] {
  return metrics
    .filter((m) => !skip.includes(m.key) && offBy(m) >= 1.5)
    .sort((a, b) => offBy(b) - offBy(a))
    .slice(0, max);
}

/** Pages and actions the search lists (labels: home:search.page.<id>). `day`: the page reads `?d=`, so it opens on the day on screen. */
export const SEARCH_PAGES = [
  { id: "home", href: "/", day: true, words: "today dashboard" },
  { id: "recovery", href: "/recovery", day: true, words: "hrv resting heart rate readiness" },
  { id: "sleep", href: "/sleep", day: true, words: "sleep performance debt need planner" },
  { id: "strain", href: "/strain", day: true, words: "load zones activity" },
  { id: "health", href: "/health", day: false, words: "" },
  { id: "pulseAge", href: "/health/healthspan", day: true, words: "healthspan pace of aging" },
  { id: "monitor", href: "/health/monitor", day: true, words: "vitals spo2 skin temperature illness" },
  { id: "stress", href: "/health/stress", day: true, words: "" },
  { id: "fitness", href: "/health/fitness", day: false, words: "vo2 max training load" },
  { id: "heartRate", href: "/health/heart-rate", day: false, words: "bpm live" },
  { id: "journal", href: "/journal", day: true, words: "behaviours behaviors check-in" },
  { id: "insights", href: "/journal/insights", day: false, words: "journal impact behaviours behaviors" },
  { id: "trends", href: "/trends", day: false, words: "" },
  { id: "reports", href: "/reports", day: false, words: "weekly monthly" },
  { id: "activities", href: "/activities", day: false, words: "workouts" },
  { id: "coach", href: "/coach", day: false, words: "ai assistant chat" },
  { id: "settings", href: "/settings", day: false, words: "profile sync health connect" },
] as const;

export const SEARCH_ACTIONS = [
  { id: "checkIn", href: "/checkin", day: true, words: "journal log" },
  { id: "review", href: "/day-review", day: true, words: "outlook summary" },
  { id: "customize", href: "/customize-home", day: false, words: "layout sections hide reorder" },
] as const;

export type SearchCommand = (typeof SEARCH_PAGES)[number] | (typeof SEARCH_ACTIONS)[number];
