import { describe, expect, it } from "vitest";
import type { DashboardGroup } from "./dashboard";
import { fold, metricOfPath, offUsual, rankMetrics } from "./search";

const GROUP: Record<DashboardGroup, string> = { recovery: "Recovery & sleep", activity: "Activity", body: "Body", nutrition: "Nutrition", vitals: "Vitals" };
const groupLabel = (g: DashboardGroup) => GROUP[g];
const POOL = [
  { key: "hrv", label: "Heart rate variability", group: "recovery" },
  { key: "rhr", label: "Resting heart rate", group: "recovery" },
  { key: "sleep", label: "Sleep performance", group: "recovery" },
  { key: "hours", label: "Hours of sleep", group: "recovery" },
  { key: "debt", label: "Sleep debt", group: "recovery" },
  { key: "steps", label: "Steps", group: "activity" },
  { key: "spo2", label: "Blood oxygen", group: "vitals" },
  { key: "skin", label: "Skin temperature", group: "vitals" },
  { key: "lean_mass", label: "Lean body mass", group: "body" },
] as const satisfies readonly { key: string; label: string; group: DashboardGroup }[];
const keys = (q: string) => rankMetrics(POOL, q, groupLabel).map((m) => m.key);

describe("rankMetrics", () => {
  it("puts a name that starts with the query first, then a name holding it", () => {
    expect(keys("sleep")).toEqual(["sleep", "debt", "hours"]);
    expect(keys("heart")).toEqual(["hrv", "rhr"]);
  });

  it("matches every word, in any order", () => {
    expect(keys("rate resting")).toEqual(["rhr"]);
  });

  it("falls back to synonyms after names", () => {
    expect(keys("spo2")).toEqual(["spo2"]);
    expect(keys("rhr")).toEqual(["rhr"]);
    expect(keys("oxygen")).toEqual(["spo2"]);
  });

  it("matches a category only when no name or synonym does, so 'sleep' never lists HRV", () => {
    expect(keys("sleep")).not.toContain("hrv");
    expect(keys("vitals")).toEqual(["spo2", "skin"]);
  });

  it("ignores case and accents", () => {
    expect(fold("Fréquence")).toBe("frequence");
    expect(keys("STEPS")).toEqual(["steps"]);
    expect(rankMetrics([{ key: "hrv", label: "Variabilité", group: "recovery" }], "variabilite", groupLabel)).toHaveLength(1);
  });

  it("returns the pool for an empty query and nothing for nonsense", () => {
    expect(keys("  ")).toHaveLength(POOL.length);
    expect(keys("zzz")).toEqual([]);
  });
});

describe("metricOfPath", () => {
  it("reads metric and trend routes and the score screens", () => {
    expect(metricOfPath("/metric/hrv")).toBe("hrv");
    expect(metricOfPath("/trend/lean_mass")).toBe("lean_mass");
    expect(metricOfPath("/recovery")).toBe("recovery");
    expect(metricOfPath("/health")).toBeNull();
    expect(metricOfPath("/metric/hrv/extra")).toBeNull();
  });
});

describe("offUsual", () => {
  const m = (key: string, value: number | null, average: number | null, sd?: number) => ({ key, metric: { value }, average, sd });
  it("keeps 1.5 SD or more, furthest first, at most four, without the skipped ones", () => {
    const list = [m("a", 10, 0, 5), m("b", 20, 0, 5), m("c", 7, 0, 5), m("d", 8, 0, 5), m("e", 9, 0, 5), m("f", 30, 0, 5), m("g", null, 0, 5), m("h", 9, 0)];
    expect(offUsual(list, ["f"]).map((x) => x.key)).toEqual(["b", "a", "e", "d"]);
    expect(offUsual(list).map((x) => x.key)).toEqual(["f", "b", "a", "e"]);
  });
});
