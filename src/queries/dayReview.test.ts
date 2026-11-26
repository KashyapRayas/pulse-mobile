// Home's day banner and review page over the 180-day demo seed, and the pure parts on hand-built rows.
import { beforeAll, describe, expect, it } from "vitest";
import { MemoryStore } from "@/data/memory";
import { seedDemo } from "@/data/seed";
import type { Profile } from "@/data/types";
import { addDays } from "@/lib/time";
import { runPipeline } from "@/pipeline";
import type { DayRow } from "./common";
import type { QueryCtx } from "./ctx";
import { getDayReview, headlineOf, REVIEW_FROM_MIN, reviewOf, weekAverage, weekDelta } from "./dayReview";

const TZ = "Asia/Kolkata";
const TODAY = "2026-10-02";
const MORNING = Date.parse("2026-10-02T09:00:00+05:30") / 1000;
const PROFILE: Profile = { birthDate: "1990-01-01", sex: "male", maxHr: 183, heightCm: 178, timeZone: TZ };
let store: MemoryStore;
const ctxAt = (now: number): QueryCtx => ({ store, profile: PROFILE, timeZone: TZ, today: TODAY, now, sync: { lastSyncTs: now, firstDay: addDays(TODAY, -179), lastError: null } });

beforeAll(async () => {
  store = new MemoryStore();
  await seedDemo(store, { today: TODAY, timeZone: TZ, now: MORNING });
  await runPipeline(store, PROFILE, { today: TODAY });
}, 120_000);

describe("getDayReview", () => {
  it("is the outlook before 17:00 today and the review after it", async () => {
    const morning = await getDayReview(TODAY, ctxAt(MORNING));
    expect(morning?.kind).toBe("outlook");
    expect(morning?.title).toBe("Your daily outlook");
    expect(morning?.live).toBe(true);
    const evening = await getDayReview(TODAY, ctxAt(Date.parse("2026-10-02T18:30:00+05:30") / 1000));
    expect(evening?.kind).toBe("review");
    expect(evening?.title).toBe("Your day in review");
  });

  it("reviews a past day whatever the hour, with scores against the 7 days before", async () => {
    const day = addDays(TODAY, -3);
    const vm = (await getDayReview(day, ctxAt(MORNING)))!;
    expect(vm.kind).toBe("review");
    expect(vm.live).toBe(false);
    expect(vm.scores.map((s) => s.key)).toEqual(["sleep", "recovery", "strain"]);
    for (const s of vm.scores) {
      expect(s.value === null || Number.isFinite(s.value)).toBe(true);
      expect(s.average === null || Number.isFinite(s.average)).toBe(true);
    }
    // The demo history is full, so each score has its week.
    expect(vm.scores.every((s) => s.average !== null)).toBe(true);
    expect(vm.headline).not.toMatch(/great|keep it up|!/i);
  });

  it("fills only the blocks the day measured, each with whole numbers", async () => {
    const vm = (await getDayReview(addDays(TODAY, -2), ctxAt(MORNING)))!;
    expect(vm.drivers.length).toBeLessThanOrEqual(2);
    for (const d of vm.drivers) {
      expect(Number.isInteger(d.points)).toBe(true);
      expect(Math.abs(d.points)).toBeGreaterThanOrEqual(1);
    }
    if (vm.drivers.length === 2) expect(Math.abs(vm.drivers[0].points)).toBeGreaterThanOrEqual(Math.abs(vm.drivers[1].points));
    if (vm.sleep) {
      expect(vm.sleep.end).toBeGreaterThan(vm.sleep.start);
      expect(vm.sleep.needMin).toBeGreaterThan(0);
    }
    if (vm.stress) expect(vm.stress.lowMin + vm.stress.mediumMin + vm.stress.highMin).toBeGreaterThan(0);
    if (vm.strain?.target) expect(vm.strain.target[0]).toBeLessThan(vm.strain.target[1]);
  });

  it("is null on a day with nothing measured", async () => {
    expect(await getDayReview(addDays(TODAY, -400), ctxAt(MORNING))).toBeNull();
  });
});

const row = (day: string, recovery: number | null): DayRow => ({ day, recovery: recovery === null ? null : { value: recovery, provisional: false, reason: null, stale: [], drivers: [] } }) as unknown as DayRow;

describe("weekAverage", () => {
  it("means the 7 days before the day, not the day itself, and needs 3 of them", () => {
    const rows = new Map<string, DayRow>();
    const day = "2026-10-10";
    rows.set(day, row(day, 99));
    rows.set(addDays(day, -1), row(addDays(day, -1), 60));
    rows.set(addDays(day, -2), row(addDays(day, -2), 70));
    const pick = (r: DayRow) => r.recovery?.value;
    expect(weekAverage(rows, day, pick)).toBeNull();
    rows.set(addDays(day, -7), row(addDays(day, -7), 80));
    rows.set(addDays(day, -8), row(addDays(day, -8), 10)); // outside the week
    expect(weekAverage(rows, day, pick)).toBe(70);
  });
});

describe("weekDelta", () => {
  it("reads small moves as flat: 3 points, or 2.5 for Strain", () => {
    expect(weekDelta({ key: "recovery", value: 62, average: 60 })?.dir).toBe("flat");
    expect(weekDelta({ key: "recovery", value: 64, average: 60 })?.dir).toBe("up");
    expect(weekDelta({ key: "strain", value: 47, average: 50 })?.dir).toBe("down");
    expect(weekDelta({ key: "strain", value: 52, average: 50 })?.dir).toBe("flat");
    expect(weekDelta({ key: "sleep", value: null, average: 80 })).toBeNull();
    expect(weekDelta({ key: "sleep", value: 80, average: null })).toBeNull();
  });
});

describe("headlineOf", () => {
  it("builds the line from the numbers, never praise", () => {
    expect(headlineOf(false, 20, null, null, null)).toBe("Low recovery. Keep today light");
    expect(headlineOf(false, 50, null, null, 45)).toBe("Short on sleep. Take it steady");
    expect(headlineOf(false, 50, null, null, 10)).toBe("Moderate recovery. Train with care");
    expect(headlineOf(false, null, null, [40, 70], null)).toBe("Strain Target 40 to 70%");
    expect(headlineOf(true, 80, 75, [40, 70], null)).toBe("You went past your Strain Target");
    expect(headlineOf(true, 80, 55, [40, 70], null)).toBe("You landed in your Strain Target");
    expect(headlineOf(true, 80, 30, [40, 70], null)).toBe("A lighter day than your target");
    expect(headlineOf(true, 80, 30, null, null)).toBe("Day Strain 30%");
    expect(headlineOf(true, null, null, null, null)).toBe("Your day");
  });
});

describe("reviewOf", () => {
  it("leaves out every block a bare row cannot fill", () => {
    const day = "2026-10-10";
    const rows = new Map([[day, row(day, 70)]]);
    const vm = reviewOf(rows, day, false, REVIEW_FROM_MIN)!;
    expect(vm.scores.find((s) => s.key === "recovery")?.value).toBe(70);
    expect(vm).toMatchObject({ strain: null, sleep: null, stress: null, energy: null, drivers: [] });
  });
});
