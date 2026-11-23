import { describe, expect, it } from "vitest";
import { hazard, paceOf, PULSE_AGE_FACTORS, pulseAge, type PulseAgeDay, references } from "./pulseAge";

const day = (o: Partial<PulseAgeDay> = {}): PulseAgeDay => ({
  sleepHours: null,
  sri: null,
  steps: null,
  zone13Min: null,
  zone45Min: null,
  strengthMin: null,
  restingHr: null,
  ...o,
});

describe("hazards", () => {
  it("every factor's reference has a hazard ratio of 1", () => {
    const refs = references(35, "male");
    for (const f of PULSE_AGE_FACTORS) expect(hazard(f, refs[f], 35, "male"), f).toBeCloseTo(1, 4);
  });
  it("clamps", () => {
    expect(hazard("sleepHours", 3, 35, "male")).toBe(1.24608);
    expect(hazard("restingHr", 120, 35, "female")).toBe(1.2214);
    expect(hazard("vo2max", 80, 35, "male")).toBe(0.60653);
  });
});

describe("pulseAge", () => {
  const refs = references(35, "male");
  // Weekly minutes come from the 28-day sum × 0.25: a daily value of weekly / 7 on every day gives the weekly figure.
  const atRef = day({
    sleepHours: refs.sleepHours,
    sri: refs.sri,
    steps: refs.steps,
    zone13Min: refs.zone13 / 7,
    zone45Min: refs.zone45 / 7,
    strengthMin: refs.strength / 7,
    restingHr: refs.restingHr,
  });
  it("at every reference, Pulse Age is the age, with full confidence", () => {
    const r = pulseAge({ age: 35, sex: "male", days: Array(28).fill(atRef), vo2: [refs.vo2max], leanPct: [refs.leanMass] })!;
    expect(r.pulseAge).toBeCloseTo(35, 3);
    expect(r.present).toBe(9);
    expect(r.confidence).toBe(1);
  });
  it("a missing factor counts zero: no scaling to nine", () => {
    // Five factors, one of them (resting HR 10 bpm high) worth 10·ln(e^0.12) = 1.2 years; the rest at reference.
    const d = day({ sleepHours: 7.5, sri: 70, steps: 8000, restingHr: refs.restingHr + 10, zone13Min: refs.zone13 / 7 });
    const r = pulseAge({ age: 35, sex: "male", days: Array(28).fill(d), vo2: [], leanPct: [] })!;
    expect(r.present).toBe(5);
    // Scaling to nine factors would have made it 1.2 · 9/5 = 2.16 years.
    expect(r.deltaYears).toBeCloseTo(1.2, 3);
  });
  it("strength never logged in the window is unknown, not zero minutes", () => {
    const base = { sleepHours: 7.5, sri: 70, steps: 8000, restingHr: refs.restingHr, zone13Min: refs.zone13 / 7, zone45Min: refs.zone45 / 7 };
    const none = pulseAge({ age: 35, sex: "male", days: Array(28).fill(day({ ...base, strengthMin: 0 })), vo2: [], leanPct: [] })!;
    expect(none.factors.find((f) => f.key === "strength")!.years).toBeNull();
    expect(none.deltaYears).toBeCloseTo(0, 3);
    // One logged 20-minute session brings it back (5 min a week, under the ~10 min reference), the other days counting 0.
    const once = pulseAge({ age: 35, sex: "male", days: [...Array(27).fill(day({ ...base, strengthMin: 0 })), day({ ...base, strengthMin: 20 })], vo2: [], leanPct: [] })!;
    expect(once.factors.find((f) => f.key === "strength")!.years).toBeGreaterThan(0);
  });
  it("shows nothing below five factors", () => {
    expect(pulseAge({ age: 35, sex: "male", days: Array(28).fill(day({ sleepHours: 7, sri: 80, steps: 9000, restingHr: 60 })), vo2: [], leanPct: [] })).toBeNull();
  });
  it("pace is Pulse Age over age within 0.6–1.6", () => {
    expect(paceOf(30, 35)).toBeCloseTo(30 / 35);
    expect(paceOf(80, 35)).toBe(1.6);
  });
});
