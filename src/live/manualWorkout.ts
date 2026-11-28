// A workout logged by hand (`/workout/log`): the sports the form offers, the draft it holds and its check. Pure, so it
// is tested in Node (manualWorkout.test.ts). The recorder (workoutRecorder.ts logManual) saves the result to Health
// Connect as a finished session with no heart-rate samples; its Strain comes from the band's heart rate in that window.
import { MIN_EXERCISE_SEC } from "@/health/exerciseDedup";
import { addDays, fromWall, wall } from "@/lib/time";
import type { WorkoutType } from "./workout";

/** The sports the form offers, the recorder's six first. */
export const LOG_TYPES = [
  "walk", "run", "cycle", "strength", "hiit", "weights", "yoga", "pilates", "swim", "hike",
  "row", "elliptical", "stairs", "tennis", "soccer", "dance", "climb", "other",
] as const;
export type LogType = (typeof LOG_TYPES)[number];

/** Health Connect's ExerciseSessionRecord types (androidx ExerciseSessionRecord constants), as HC_EXERCISE. */
export const LOG_HC: Record<LogType, number> = {
  walk: 79, run: 56, cycle: 8, strength: 70, hiit: 36, weights: 81, yoga: 83, pilates: 48, swim: 74, hike: 37,
  row: 54, elliptical: 25, stairs: 68, tennis: 76, soccer: 64, dance: 16, climb: 51, other: 0,
};

/** The recorder's own type for a logged sport (the workout row needs one); the rest are "other". */
export const recorderType = (t: LogType): WorkoutType =>
  t === "weights" ? "strength" : t === "walk" || t === "run" || t === "cycle" || t === "strength" || t === "hiit" ? t : "other";

/** The longest workout the form takes. */
export const MAX_LOG_MIN = 24 * 60;
/** Pulse imports this many days of history; a workout before them would never show. */
export const LOG_HISTORY_DAYS = 180;

/** What the form holds: a sport, the start as a wall string (`YYYY-MM-DDTHH:mm`), minutes as typed, a title. */
export type LogDraft = { type: LogType | ""; start: string; minutes: string; title: string };

/** A checked workout: unix milliseconds, as the recorder keeps them. */
export type ManualWorkout = { type: LogType; start: number; end: number; title: string | null };

export type LogProblem = "type" | "start" | "minutes" | "short" | "long" | "future" | "old";

export type LogCheck = { ok: true; workout: ManualWorkout } | { ok: false; problem: LogProblem };

/**
 * A new form: on today, a 45-minute workout that ends now (to the minute); on a past day, one at 12:00.
 * `now` in unix seconds.
 */
export function draftFor(day: string, today: string, timeZone: string, now: number, type: LogType | "" = ""): LogDraft {
  const minutes = 45;
  if (day !== today) return { type, start: `${day}T12:00`, minutes: String(minutes), title: "" };
  const w = wall(now - minutes * 60, timeZone);
  return { type, start: `${w.day}T${w.time.slice(0, 5)}`, minutes: String(minutes), title: "" };
}

/** The draft as a workout, or the first problem to show. `now` in unix seconds. */
export function checkDraft(d: LogDraft, timeZone: string, now: number): LogCheck {
  if (!d.type) return { ok: false, problem: "type" };
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(d.start)) return { ok: false, problem: "start" };
  const typed = d.minutes.trim();
  if (!/^\d+$/.test(typed)) return { ok: false, problem: "minutes" };
  const minutes = Number(typed);
  // The import drops a session under MIN_EXERCISE_SEC: saved, it would sit in Google Health and never show in Pulse.
  if (minutes * 60 < MIN_EXERCISE_SEC) return { ok: false, problem: "short" };
  if (minutes > MAX_LOG_MIN) return { ok: false, problem: "long" };
  const start = fromWall(d.start, timeZone);
  if (!Number.isFinite(start)) return { ok: false, problem: "start" };
  const end = start + minutes * 60;
  if (end > now) return { ok: false, problem: "future" };
  if (d.start.slice(0, 10) <= addDays(wall(now, timeZone).day, -LOG_HISTORY_DAYS)) return { ok: false, problem: "old" };
  const title = d.title.trim();
  return { ok: true, workout: { type: d.type, start: start * 1000, end: end * 1000, title: title || null } };
}

/** The imported workouts (unix seconds) that share any time with `w`: the form asks before saving a second copy. */
export function overlapping<T extends { startTs: number; endTs: number }>(w: Pick<ManualWorkout, "start" | "end">, exercises: readonly T[]): T[] {
  const start = w.start / 1000;
  const end = w.end / 1000;
  return exercises.filter((e) => e.startTs < end && e.endTs > start);
}
