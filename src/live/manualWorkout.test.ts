import { describe, expect, it } from "vitest";
import { fromWall } from "@/lib/time";
import { checkDraft, draftFor, LOG_HC, LOG_TYPES, overlapping, recorderType, type LogDraft } from "./manualWorkout";
import { HC_EXERCISE } from "./workout";

const TZ = "Asia/Kolkata";
/** 2026-10-08 18:30 in Kolkata. */
const NOW = fromWall("2026-10-08T18:30", TZ);
const draft = (patch: Partial<LogDraft> = {}): LogDraft => ({ type: "strength", start: "2026-10-08T17:00", minutes: "45", title: "", ...patch });

describe("draftFor", () => {
  it("ends today's workout now, 45 minutes long", () => {
    expect(draftFor("2026-10-08", "2026-10-08", TZ, NOW)).toEqual({ type: "", start: "2026-10-08T17:45", minutes: "45", title: "" });
  });
  it("starts a past day's workout at noon, with the type it was opened with", () => {
    expect(draftFor("2026-10-05", "2026-10-08", TZ, NOW, "run")).toEqual({ type: "run", start: "2026-10-05T12:00", minutes: "45", title: "" });
  });
});

describe("checkDraft", () => {
  it("turns the draft into milliseconds in the person's zone", () => {
    const r = checkDraft(draft({ title: "  Legs  " }), TZ, NOW);
    expect(r).toEqual({ ok: true, workout: { type: "strength", start: Date.UTC(2026, 9, 8, 11, 30), end: Date.UTC(2026, 9, 8, 12, 15), title: "Legs" } });
  });
  it("keeps a blank title as null", () => {
    const r = checkDraft(draft({ title: "   " }), TZ, NOW);
    expect(r.ok && r.workout.title).toBeNull();
  });
  it("names the first problem", () => {
    expect(checkDraft(draft({ type: "" }), TZ, NOW)).toEqual({ ok: false, problem: "type" });
    expect(checkDraft(draft({ start: "" }), TZ, NOW)).toEqual({ ok: false, problem: "start" });
    expect(checkDraft(draft({ minutes: "" }), TZ, NOW)).toEqual({ ok: false, problem: "minutes" });
    expect(checkDraft(draft({ minutes: "4.5" }), TZ, NOW)).toEqual({ ok: false, problem: "minutes" });
    expect(checkDraft(draft({ minutes: "1" }), TZ, NOW)).toEqual({ ok: false, problem: "short" });
    expect(checkDraft(draft({ minutes: "1441" }), TZ, NOW)).toEqual({ ok: false, problem: "long" });
  });
  it("takes two minutes, the import's floor, and a whole day", () => {
    expect(checkDraft(draft({ start: "2026-10-08T10:00", minutes: "2" }), TZ, NOW).ok).toBe(true);
    expect(checkDraft(draft({ start: "2026-10-06T10:00", minutes: "1440" }), TZ, NOW).ok).toBe(true);
  });
  it("refuses a workout that has not ended yet", () => {
    expect(checkDraft(draft({ start: "2026-10-08T18:00", minutes: "31" }), TZ, NOW)).toEqual({ ok: false, problem: "future" });
    expect(checkDraft(draft({ start: "2026-10-08T18:00", minutes: "30" }), TZ, NOW).ok).toBe(true);
  });
  it("refuses a day before the 180 days Pulse imports", () => {
    expect(checkDraft(draft({ start: "2026-04-11T10:00" }), TZ, NOW)).toEqual({ ok: false, problem: "old" });
    expect(checkDraft(draft({ start: "2026-04-12T10:00" }), TZ, NOW).ok).toBe(true);
  });
});

describe("overlapping", () => {
  const w = { start: 10_000_000, end: 13_600_000 };
  it("finds the workouts that share any time, and not the ones that only touch", () => {
    const rows = [
      { id: "before", startTs: 6_400, endTs: 10_000 },
      { id: "inside", startTs: 11_000, endTs: 12_000 },
      { id: "across", startTs: 13_000, endTs: 20_000 },
      { id: "after", startTs: 13_600, endTs: 14_000 },
    ];
    expect(overlapping(w, rows).map((r) => r.id)).toEqual(["inside", "across"]);
  });
});

describe("the sports", () => {
  it("map the recorder's six to the codes it writes", () => {
    for (const t of ["walk", "run", "cycle", "strength", "hiit", "other"] as const) expect(LOG_HC[t]).toBe(HC_EXERCISE[t]);
  });
  it("give each sport its own code, and weights count as strength", () => {
    expect(new Set(LOG_TYPES.map((t) => LOG_HC[t])).size).toBe(LOG_TYPES.length);
    expect(recorderType("weights")).toBe("strength");
    expect(recorderType("yoga")).toBe("other");
    expect(recorderType("run")).toBe("run");
  });
});
