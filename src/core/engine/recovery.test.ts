import { describe, expect, it } from "vitest";
import { compDown, compUp, lnAgg, recovery, rrAdjust, SD_FLOOR, tempAdjust } from "./recovery";

const b = (avg: number, sd: number) => ({ avg, sd, count: 30 });

describe("components", () => {
  it("map z in [−1, 1] onto 0–100, below −1 gives 0; a baseline of under 2 nights gives 50", () => {
    expect(compUp(50, b(50, 10))).toBe(50);
    expect(compUp(60, b(50, 10))).toBe(100);
    expect(compUp(80, b(50, 10))).toBe(100);
    expect(compUp(45, b(50, 10))).toBe(25);
    expect(compUp(39, b(50, 10))).toBe(0);
    expect(compUp(70, { avg: 50, sd: 0, count: 1 })).toBe(50);
    expect(compDown(55, b(60, 5))).toBe(100);
    expect(compDown(62, b(60, 4))).toBe(25);
    expect(compDown(62, { avg: 60, sd: 0, count: 1 })).toBe(50);
  });
  it("floors a baseline's SD at the measure's typical error", () => {
    // A quiet month of whole-bpm resting HR: SD 0.3. Without the floor 1 bpm up was z −3.3 (component 0).
    expect(compDown(61, b(60, 0.3), SD_FLOOR.rhr)).toBeCloseTo((-(1 / 1.5) * 0.5 + 0.5) * 100, 9);
    expect(compDown(61, b(60, 0), SD_FLOOR.rhr)).toBeCloseTo((-(1 / 1.5) * 0.5 + 0.5) * 100, 9);
    // A wider baseline keeps its own SD.
    expect(compDown(62, b(60, 4), SD_FLOOR.rhr)).toBe(25);
  });
  it("HRV on ln(ms): the same relative drop scores alike at 25 and 100 ms", () => {
    const ln = (msNights: number[]) => {
      const xs = msNights.map(Math.log);
      const m = xs.reduce((a, x) => a + x, 0) / xs.length;
      return { avg: m, sd: Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / xs.length), count: xs.length };
    };
    const nights = (mid: number) => [0.92, 1, 1.08, 0.96, 1.04].map((k) => mid * k);
    expect(compUp(Math.log(25 * 0.95), ln(nights(25)))).toBeCloseTo(compUp(Math.log(100 * 0.95), ln(nights(100))), 9);
    expect(lnAgg({ avg: 50, sd: 0, count: 1 })).toEqual({ avg: Math.log(50), sd: 0, count: 1 });
    expect(lnAgg({ avg: 0, sd: 0, count: 1 })).toBeNull();
  });
  it("respiratory rate adjusts ±10; temperature only lowers, at most 30", () => {
    expect(rrAdjust(16, b(15, 1))).toBe(-10);
    expect(rrAdjust(14, b(15, 1))).toBe(10);
    expect(tempAdjust(-0.5, b(0, 0.2))).toBe(0);
    expect(tempAdjust(1, b(0, 0.1))).toBeCloseTo(30 * Math.atan(-1));
    expect(tempAdjust(100, b(0, 0.1))).toBe(-30);
  });
});

describe("recovery", () => {
  it("golden: HRV z +0.5, RHR at baseline, sleep 80, respiration up 0.5 SD", () => {
    // 0.4 · 75 + 0.3 · 50 + 0.3 · 80 + (25 − 50) · 0.2 = 30 + 15 + 24 − 5 = 64
    const r = recovery({ hrv: 55, hrvBase: b(50, 10), rhr: 60, rhrBase: b(60, 4), sleepScore: 80, resp: 15.5, respBase: b(15, 1) });
    expect(r.value).toBeCloseTo(64);
  });
  it("clamps to [1, 100]", () => {
    expect(recovery({ hrv: 0, hrvBase: b(50, 1), rhr: 99, rhrBase: b(60, 1), sleepScore: 0, temp: 9, tempBase: b(0, 0.1) }).value).toBe(1);
    expect(recovery({ hrv: 90, hrvBase: b(50, 1), rhr: 40, rhrBase: b(60, 1), sleepScore: 100, resp: 10, respBase: b(15, 1) }).value).toBe(100);
  });
  it("lists what it lacks; the adjustments never gate", () => {
    expect(recovery({ hrv: null, hrvBase: null, rhr: 60, rhrBase: b(60, 4), sleepScore: null })).toEqual({ value: null, missing: ["hrv", "hrvBaseline", "sleepScore"] });
    expect(recovery({ hrv: 50, hrvBase: b(50, 5), rhr: 60, rhrBase: b(60, 4), sleepScore: 70, resp: null, respBase: null }).value).toBeCloseTo(56);
  });
  it("more HRV never lowers Recovery; a higher resting HR never raises it", () => {
    const at = (hrv: number, rhr: number) => recovery({ hrv, hrvBase: b(50, 8), rhr, rhrBase: b(58, 3), sleepScore: 75 }).value!;
    for (let h = 20; h < 90; h += 2) expect(at(h + 2, 58)).toBeGreaterThanOrEqual(at(h, 58));
    for (let r = 50; r < 70; r++) expect(at(50, r + 1)).toBeLessThanOrEqual(at(50, r));
  });
});
