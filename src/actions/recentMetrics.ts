// Search's "Recent": the last metrics opened, newest first, kept on the phone in AsyncStorage "pulse.recentMetrics"
// (the web keeps them in localStorage). Opening a metric's screen by any path puts it first (app/_layout.tsx).
import AsyncStorage from "@react-native-async-storage/async-storage";

export const RECENT_METRICS_KEY = "pulse.recentMetrics";
export const RECENT_MAX = 5;

let cache: string[] | undefined;

const parse = (raw: string | null): string[] => {
  try {
    const v: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v.filter((k): k is string => typeof k === "string").slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
};

export async function recentMetrics(): Promise<string[]> {
  if (cache === undefined) cache = parse(await AsyncStorage.getItem(RECENT_METRICS_KEY).catch(() => null));
  return cache;
}

/** Puts `key` first, keeping the five newest. */
export async function pushRecentMetric(key: string): Promise<void> {
  const next = [key, ...(await recentMetrics()).filter((k) => k !== key)].slice(0, RECENT_MAX);
  cache = next;
  await AsyncStorage.setItem(RECENT_METRICS_KEY, JSON.stringify(next)).catch(() => {});
}
