// Follow-up questions under the latest answer, chosen from what that answer looked up: after a sleep lookup, "How can I
// sleep better tonight?". Chosen on the phone from a fixed list, never written by the model, so they are always questions
// the coach's tools can answer. Pure: the screen turns the keys into text (`coach:followUps.<key>`).

/** Each tool's follow-ups, most useful first. A tool with none (the profile) adds nothing. */
const BY_TOOL: Record<string, readonly string[]> = {
  get_day: ["dayTrain", "dayRecover"],
  get_sleep: ["sleepTonight", "sleepBedtime"],
  get_activity: ["workoutNext", "workoutWeek"],
  get_activities: ["workoutWeek", "workoutNext"],
  get_trend: ["trendWhy", "trendMonth"],
  get_journal_impacts: ["habitsFocus"],
  get_health: ["healthWatch"],
  get_report: ["reportFocus"],
};

export const FOLLOW_UP_KEYS = [...new Set(Object.values(BY_TOOL).flat())];

/**
 * Up to `max` follow-up keys for the tools an answer used, in that order: each tool's first follow-up, then each
 * tool's second, so three lookups give three different topics. No tools, no follow-ups.
 */
export function followUps(tools: readonly string[], max = 3): string[] {
  const lists = tools.map((t) => BY_TOOL[t] ?? []);
  const out: string[] = [];
  const longest = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < longest && out.length < max; i++)
    for (const list of lists) {
      const key = list[i];
      if (key && !out.includes(key)) out.push(key);
      if (out.length >= max) break;
    }
  return out;
}
