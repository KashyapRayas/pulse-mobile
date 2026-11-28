// Metric search's index over the 180-day demo seed: every searchable metric, valued on the day asked for.
import { beforeAll, describe, expect, it } from "vitest";
import { MemoryStore } from "@/data/memory";
import { seedDemo } from "@/data/seed";
import type { Profile } from "@/data/types";
import { addDays } from "@/lib/time";
import { runPipeline } from "@/pipeline";
import type { QueryCtx } from "./ctx";
import { getSearchIndex, SEARCHABLE } from "./search";

const TZ = "Asia/Kolkata";
const TODAY = "2026-10-02";
const NOW = Date.parse("2026-10-02T14:00:00+05:30") / 1000;
const PROFILE: Profile = { birthDate: "1990-01-01", sex: "male", maxHr: 183, heightCm: 178, timeZone: TZ };
let ctx: QueryCtx;

beforeAll(async () => {
  const store = new MemoryStore();
  await seedDemo(store, { today: TODAY, timeZone: TZ, now: NOW });
  await runPipeline(store, PROFILE, { today: TODAY });
  ctx = { store, profile: PROFILE, timeZone: TZ, today: TODAY, now: NOW, sync: { lastSyncTs: NOW, firstDay: addDays(TODAY, -179), lastError: null } };
}, 120_000);

describe("getSearchIndex", () => {
  it("lists every searchable metric with its group, and never Stress Monitor (a page)", async () => {
    const idx = await getSearchIndex(TODAY, ctx);
    expect(idx.metrics.map((m) => m.key)).toEqual(SEARCHABLE.map((m) => m.key));
    expect(idx.metrics.some((m) => (m.key as string) === "stress")).toBe(false);
    for (const m of idx.metrics) expect(m.group).toBeTruthy();
  });

  it("values a past day on that day, not today", async () => {
    const past = addDays(TODAY, -5);
    const [now, then] = await Promise.all([getSearchIndex(TODAY, ctx), getSearchIndex(past, ctx)]);
    expect(then.day).toBe(past);
    const hrv = (i: typeof now) => i.metrics.find((m) => m.key === "hrv")!.metric.value;
    expect(hrv(then)).not.toBeNull();
    expect(hrv(then)).not.toBe(hrv(now));
  });

  it("opens Lean body mass on its own trend, not Weight", async () => {
    const idx = await getSearchIndex(TODAY, ctx);
    expect(idx.metrics.find((m) => m.key === "lean_mass")?.href).toBe("/trend/lean_mass");
  });
});
