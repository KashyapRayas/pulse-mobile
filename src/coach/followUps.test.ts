import { describe, expect, it } from "vitest";
import en from "@/i18n/locales/en/coach.json";
import { FOLLOW_UP_KEYS, followUps } from "./followUps";

describe("followUps", () => {
  it("takes each tool's first follow-up before any second one", () => {
    expect(followUps(["get_sleep", "get_day"])).toEqual(["sleepTonight", "dayTrain", "sleepBedtime"]);
  });

  it("stops at the limit and never repeats a key", () => {
    expect(followUps(["get_activity", "get_activities", "get_trend"])).toEqual(["workoutNext", "workoutWeek", "trendWhy"]);
    expect(followUps(["get_day", "get_sleep", "get_trend", "get_health"], 2)).toEqual(["dayTrain", "sleepTonight"]);
  });

  it("gives none without tools, or for tools with no follow-up", () => {
    expect(followUps([])).toEqual([]);
    expect(followUps(["get_profile", "unknown_tool"])).toEqual([]);
  });

  it("has English text for every key", () => {
    const text = en.followUps as Record<string, string>;
    for (const key of FOLLOW_UP_KEYS) expect(text[key], key).toBeTruthy();
  });
});
