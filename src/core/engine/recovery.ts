// Recovery, 1–100. Reference study, recovery-stress-energy.md § Recovery: 0.4·HRV + 0.3·RHR + 0.3·Sleep Score, then the
// respiratory-rate and temperature adjustments, clamped to [1, 100]. HRV and resting HR are last night's means against
// their 60-day baselines; each maps z in [−1, 1] onto 0–100 (below −1 gives 0). SpO2 is left out: Fitbit does not write
// it to Health Connect. Doubles throughout (fix 18).
//
// Two departures from the study, to match HRV-monitoring practice (Plews 2013, Buchheit 2014):
// - HRV is compared as ln(RMSSD): RMSSD is right-skewed and its spread grows with its level, so the same relative
//   change now moves the score alike at 25 ms and at 100 ms. The caller passes `hrv` and `hrvBase` in ln(ms).
// - Each baseline's SD has a floor near the measure's night-to-night typical error. Without one, a quiet month gave
//   an SD of a few tenths, after which a 1 bpm or 0.4 breaths/min change swung a component from 50 to 0 or 100.
import type { Agg } from "./baselines";
import { clamp } from "./math";

/**
 * The smallest SD each baseline is trusted with, in its own units: about the night-to-night typical error of the
 * measure (ln HRV about 5 %, Fitbit's whole-bpm resting HR 1.5 bpm, respiratory rate 0.4 breaths/min, skin temperature
 * 0.1 °C). A baseline of fewer than 2 nights has no spread at all and still reads neutral.
 */
export const SD_FLOOR = { hrvLn: 0.05, rhr: 1.5, resp: 0.4, temp: 0.1 } as const;

/** The SD a z-score divides by: the baseline's, at least `floor`; 0 when it pools fewer than 2 nights (neutral). */
export const sdOf = (b: Agg, floor: number) => (b.count < 2 && b.sd === 0 ? 0 : Math.max(b.sd, floor));

/** Higher is better (HRV, in ln ms): z = (cur − mean) / sd; no spread gives 50. */
export function compUp(cur: number, b: Agg, floor: number = SD_FLOOR.hrvLn): number {
  const sd = sdOf(b, floor);
  const z = sd === 0 ? 0 : (cur - b.avg) / sd;
  return z < -1 ? 0 : (Math.min(z, 1) * 0.5 + 0.5) * 100;
}

/** Lower is better (resting HR, respiratory rate): z = −(cur − mean) / sd; no spread gives 50. */
export function compDown(cur: number, b: Agg, floor: number = SD_FLOOR.rhr): number {
  const sd = sdOf(b, floor);
  if (sd === 0) return 50;
  const z = -(cur - b.avg) / sd;
  return z < -1 ? 0 : (Math.min(z, 1) * 0.5 + 0.5) * 100;
}

/** Respiratory rate: (component − 50) · 0.2, so ±10 points at most. */
export const rrAdjust = (cur: number, b: Agg) => (compDown(cur, b, SD_FLOOR.resp) - 50) * 0.2;

/** Temperature above baseline only lowers the score: 30·atan(min(z, 0) / 10), at least −30, with z = −(cur − mean) / sd. */
export function tempAdjust(cur: number, b: Agg): number {
  const sd = sdOf(b, SD_FLOOR.temp);
  const z = sd === 0 ? 0 : -(cur - b.avg) / sd;
  return Math.max(-30, Math.atan(Math.min(z, 0) / 10) * 30);
}

/** A daily HRV baseline moved to ln(ms): each night's value logged, then pooled as before. */
export const lnAgg = (a: Agg | null | undefined): Agg | null => (a && a.avg > 0 ? { avg: Math.log(a.avg), sd: 0, count: a.count } : null);

export type RecoveryInput = {
  /** Last night's HRV and its baseline, both in ln(ms) (lnAgg). */
  hrv: number | null;
  hrvBase: Agg | null;
  rhr: number | null;
  rhrBase: Agg | null;
  sleepScore: number | null;
  resp?: number | null;
  respBase?: Agg | null;
  temp?: number | null;
  tempBase?: Agg | null;
};

export type RecoveryMissing = "hrv" | "hrvBaseline" | "rhr" | "rhrBaseline" | "sleepScore";

export type RecoveryResult =
  | { value: number; parts: { hrv: number; rhr: number; sleep: number; resp: number; temp: number } }
  | { value: null; missing: RecoveryMissing[] };

/** The score, or what it lacks (HRV, resting HR, their baselines, the Sleep Score; the adjustments never gate). */
export function recovery(a: RecoveryInput): RecoveryResult {
  const missing: RecoveryMissing[] = [];
  if (a.hrv == null) missing.push("hrv");
  if (a.hrvBase == null) missing.push("hrvBaseline");
  if (a.rhr == null) missing.push("rhr");
  if (a.rhrBase == null) missing.push("rhrBaseline");
  if (a.sleepScore == null) missing.push("sleepScore");
  if (missing.length) return { value: null, missing };
  const parts = {
    hrv: compUp(a.hrv!, a.hrvBase!, SD_FLOOR.hrvLn),
    rhr: compDown(a.rhr!, a.rhrBase!, SD_FLOOR.rhr),
    sleep: a.sleepScore!,
    resp: a.resp != null && a.respBase ? rrAdjust(a.resp, a.respBase) : 0,
    temp: a.temp != null && a.tempBase ? tempAdjust(a.temp, a.tempBase) : 0,
  };
  const sum = parts.hrv * 0.4 + parts.rhr * 0.3 + parts.sleep * 0.3 + parts.resp + parts.temp;
  return { value: clamp(sum, 1, 100), parts };
}

/** Recovery bands: high from 67, medium from 34 (reference study, shared-machinery.md § G09). */
export const recoveryBand = (v: number) => (v >= 67 ? "high" : v >= 34 ? "medium" : "low");
