// Home's day banner and its review page (pulse src/server/queries/home.ts `outlookOf`, spec §7.1 7a): the morning
// outlook before 17:00 today, the day in review after it and on past days. A Pulse-only extra on halo's Home: the
// banner's headline, the three scores against the week before, the Strain track, what moved Recovery, the stress split,
// the Energy Bank and the night. Every part is null (or empty) when the day did not measure it, so the page draws only
// what was there and never a made-up number.
import { i18n } from "@/i18n/config";
import { addDays, localMinutes } from "@/lib/time";
import type { ChargeDriver } from "@/core/scoring/drivers";
import { type DayRow, dayStrainOf, finite, loadDays, ms, nightNeedMin, recoveryBand, recoveryMetric, sleepMetric, strainMetric, todayOf } from "./common";
import type { QueryCtx } from "./ctx";

/** The banners switch from outlook to review at 17:00 (inferred, spec §12 I15); halo's Home uses the same hour. */
export const REVIEW_FROM_MIN = 17 * 60;

export type ReviewScoreKey = "sleep" | "recovery" | "strain";
/** One score with the mean of the 7 days before the day (null with fewer than 3 of them scored). */
export type ReviewScore = { key: ReviewScoreKey; value: number | null; average: number | null };

export type DayReviewVM = {
  kind: "outlook" | "review";
  day: string;
  /** The day is today, so its numbers still move ("so far", "Now at"). */
  live: boolean;
  title: string;
  /** One plain line built from the numbers, never praise. */
  headline: string;
  scores: ReviewScore[];
  /** Strain is a percent (0 to 100 on most days); `target` is the day's Strain Target band. */
  strain: { value: number; target: [number, number] | null } | null;
  /** The night that ended this day. Times are epoch ms. */
  sleep: {
    asleepMin: number;
    needMin: number;
    start: number;
    end: number;
    stages: { deep: number; rem: number; light: number; awake: number } | null;
    debtMin: number;
  } | null;
  stress: { lowMin: number; mediumMin: number; highMin: number } | null;
  energy: { start: number; now: number; charged: number; drained: number } | null;
  /** The two largest Recovery drivers, as signed whole points. */
  drivers: { key: DriverKey; label: string; points: number }[];
};

type DriverKey = "hrv" | "rhr" | "resp" | "sleep" | "skin";
const DRIVER_KEY = {
  HEART_RATE_VARIABILITY: "hrv",
  RESTING_HEART_RATE: "rhr",
  RESPIRATORY_RATE: "resp",
  SLEEP_QUALITY: "sleep",
  SKIN_TEMPERATURE: "skin",
} as const satisfies Record<ChargeDriver["label"], DriverKey>;

/** Mean of `pick` on the 7 days before `day` that have one; null with fewer than 3. */
export function weekAverage(rows: Map<string, DayRow>, day: string, pick: (r: DayRow) => number | null | undefined): number | null {
  const xs: number[] = [];
  for (let k = 1; k <= 7; k++) {
    const r = rows.get(addDays(day, -k));
    const v = r ? pick(r) : null;
    if (finite(v)) xs.push(v);
  }
  return xs.length >= 3 ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

const pct = (x: number) => Math.round(x);

/** The banner's line: what the day came to, from the numbers. Morning reads Recovery and sleep; evening reads Strain. */
export function headlineOf(review: boolean, rec: number | null, strain: number | null, target: [number, number] | null, sleepShortMin: number | null): string {
  if (!review) {
    if (rec == null) return target ? i18n.t("home:review.headline.target", { low: pct(target[0]), high: pct(target[1]) }) : i18n.t("home:review.headline.plan");
    const band = recoveryBand(rec);
    if (band === "red") return i18n.t("home:review.headline.red");
    if (band === "yellow") return i18n.t(sleepShortMin != null && sleepShortMin >= 30 ? "home:review.headline.shortSleep" : "home:review.headline.yellow");
    return i18n.t("home:review.headline.green");
  }
  if (strain != null && target) {
    if (strain > target[1]) return i18n.t("home:review.headline.past");
    if (strain >= target[0]) return i18n.t("home:review.headline.inTarget");
    return i18n.t("home:review.headline.lighter");
  }
  if (strain != null) return i18n.t("home:review.headline.strain", { value: pct(strain) });
  return rec != null ? i18n.t("home:review.headline.recovery", { value: pct(rec) }) : i18n.t("home:review.headline.day");
}

/** The review of one day from its row and the rows before it (pure, so tests can feed it rows). */
export function reviewOf(rows: Map<string, DayRow>, day: string, isToday: boolean, nowMin: number): DayReviewVM | null {
  const row = rows.get(day);
  const review = !isToday || nowMin >= REVIEW_FROM_MIN;
  const rec = recoveryMetric(row, isToday).value;
  const sleepPerf = sleepMetric(row, isToday).value;
  const strainV = strainMetric(row).value;
  const target = row?.strainTarget?.reason === null ? ([row.strainTarget.low, row.strainTarget.high] as [number, number]) : null;
  const main = row?.sleep?.main;
  const needMin = nightNeedMin(row?.sleep);
  const st = row?.stress;
  const eb = row?.energyBank;

  const sleep: DayReviewVM["sleep"] =
    main && needMin
      ? {
          asleepMin: main.asleepMin,
          needMin,
          start: ms(main.start),
          end: ms(main.end),
          stages:
            main.staged && main.deepMin != null && main.remMin != null && main.lightMin != null
              ? { deep: main.deepMin, rem: main.remMin, light: main.lightMin, awake: main.awakeMin }
              : null,
          debtMin: row?.sleep?.debtMin ?? 0,
        }
      : null;
  const stress = st && st.average != null && st.lowMin + st.mediumMin + st.highMin > 0 ? { lowMin: st.lowMin, mediumMin: st.mediumMin, highMin: st.highMin } : null;
  const energy = eb && eb.value != null ? { start: eb.startLevel, now: eb.value, charged: eb.charged, drained: eb.drained } : null;
  const drivers = (rec != null ? (row?.recovery?.drivers ?? []) : [])
    .filter((d) => finite(d.deltaPoints) && Math.abs(d.deltaPoints) >= 1)
    .sort((a, b) => Math.abs(b.deltaPoints) - Math.abs(a.deltaPoints))
    .slice(0, 2)
    .map((d) => ({ key: DRIVER_KEY[d.label], label: i18n.t(`recovery:subject.${DRIVER_KEY[d.label]}`), points: Math.round(d.deltaPoints) }));

  // Nothing the day measured: no banner (Home shows the dials' reason instead).
  if (rec == null && sleepPerf == null && strainV == null && !sleep && !stress && !energy) return null;
  return {
    kind: review ? "review" : "outlook",
    day,
    live: isToday,
    title: i18n.t(review ? "home:outlook.titleReview" : "home:outlook.titleOutlook"),
    headline: headlineOf(review, rec, strainV, target, sleep ? sleep.needMin - sleep.asleepMin : null),
    scores: [
      { key: "sleep", value: sleepPerf, average: weekAverage(rows, day, (r) => r.sleep?.performance) },
      { key: "recovery", value: rec, average: weekAverage(rows, day, (r) => r.recovery?.value) },
      { key: "strain", value: strainV, average: weekAverage(rows, day, (r) => dayStrainOf(r.s1)) },
    ],
    strain: strainV != null ? { value: strainV, target } : null,
    sleep,
    stress,
    energy,
    drivers,
  };
}

/** The day banner and its page for `day`: the day and the 7 before it. */
export async function getDayReview(day: string, ctx: QueryCtx): Promise<DayReviewVM | null> {
  const isToday = day === todayOf(ctx);
  const rows = await loadDays(ctx, addDays(day, -7), day);
  return reviewOf(rows, day, isToday, localMinutes(ctx.now, ctx.timeZone));
}

/** A score's move against its week, as the tiles mark it: flat inside 3 points (Strain, a percent: 2.5, the web's 0.5 of 21). */
export function weekDelta(s: ReviewScore): { diff: number; dir: "up" | "down" | "flat" } | null {
  if (s.value == null || s.average == null) return null;
  const diff = s.value - s.average;
  const band = s.key === "strain" ? 2.5 : 3;
  return { diff, dir: Math.abs(diff) <= band ? "flat" : diff > 0 ? "up" : "down" };
}
