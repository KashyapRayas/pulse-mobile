// Home's layout as the person arranges it (Customize Home; pulse src/lib/home-layout.ts, spec §11 CH1): which sections
// show, and their order within each area. The score dials always lead and are not listed. Stored keys are these keys;
// never rename one. Labels are i18n keys (home:customize.section.<key>), resolved where they are shown.

export const HOME_SECTIONS = [
  { key: "heartRate", area: "top" },
  { key: "monitors", area: "top" },
  { key: "coach", area: "top" },
  { key: "day", area: "day" },
  { key: "activities", area: "day" },
  { key: "tonight", area: "day" },
  { key: "journal", area: "day" },
  { key: "energy", area: "day" },
  { key: "dashboard", area: "side" },
  { key: "strainRecovery", area: "side" },
  { key: "week", area: "side" },
] as const;

export type HomeSectionKey = (typeof HOME_SECTIONS)[number]["key"];
export type HomeArea = (typeof HOME_SECTIONS)[number]["area"];
/** Areas in Home's order: under the dials, My Day, the dashboard. */
export const HOME_AREAS: readonly HomeArea[] = ["top", "day", "side"];

const AREA = Object.fromEntries(HOME_SECTIONS.map((s) => [s.key, s.area])) as Record<HomeSectionKey, HomeArea>;
export const isHomeSectionKey = (k: unknown): k is HomeSectionKey => typeof k === "string" && Object.hasOwn(AREA, k);
export const areaOf = (k: HomeSectionKey) => AREA[k];

/** Every section in display order, and the ones turned off. */
export type HomeLayout = { order: HomeSectionKey[]; hidden: HomeSectionKey[] };

export const HOME_DEFAULT: HomeLayout = { order: HOME_SECTIONS.map((s) => s.key), hidden: [] };

/**
 * A stored layout made whole: unknown keys dropped, sections added since it was saved put back at their default place,
 * and each section kept in its own area (a move only reorders within the area). Anything that is not a layout reads as
 * the default.
 */
export function normalizeLayout(stored: unknown): HomeLayout {
  if (!stored || typeof stored !== "object") return HOME_DEFAULT;
  const s = stored as { order?: unknown; hidden?: unknown };
  const list = (v: unknown) => (Array.isArray(v) ? v.filter(isHomeSectionKey) : []);
  const known = [...new Set(list(s.order))];
  const seen = new Set(known);
  const order = [...known];
  for (const [i, k] of HOME_DEFAULT.order.entries()) {
    if (seen.has(k)) continue;
    // After its default predecessor where that is placed, else at the start (the area sort below puts it in its area).
    const prev = HOME_DEFAULT.order.slice(0, i).reverse().find((p) => seen.has(p));
    order.splice(prev ? order.indexOf(prev) + 1 : 0, 0, k);
    seen.add(k);
  }
  const byArea = HOME_AREAS.flatMap((a) => order.filter((k) => AREA[k] === a));
  return { order: byArea, hidden: [...new Set(list(s.hidden))] };
}

export const sameLayout = (a: HomeLayout, b: HomeLayout) => a.order.join() === b.order.join() && [...a.hidden].sort().join() === [...b.hidden].sort().join();

export const isDefaultLayout = (l: HomeLayout) => sameLayout(l, HOME_DEFAULT);

/** The visible keys of one area, in order. */
export const visibleIn = (layout: HomeLayout, area: HomeArea) => layout.order.filter((k) => AREA[k] === area && !layout.hidden.includes(k));

/** `k` moved one place up (-1) or down (1) within its area; the same layout at the area's end. */
export function moveSection(layout: HomeLayout, k: HomeSectionKey, by: -1 | 1): HomeLayout {
  const area = layout.order.filter((o) => AREA[o] === AREA[k]);
  const j = area.indexOf(k) + by;
  if (j < 0 || j >= area.length) return layout;
  const swap = area[j];
  return { ...layout, order: layout.order.map((o) => (o === k ? swap : o === swap ? k : o)) };
}

/** `k` shown or hidden. */
export const showSection = (layout: HomeLayout, k: HomeSectionKey, on: boolean): HomeLayout => ({
  ...layout,
  hidden: on ? layout.hidden.filter((h) => h !== k) : layout.hidden.includes(k) ? layout.hidden : [...layout.hidden, k],
});
