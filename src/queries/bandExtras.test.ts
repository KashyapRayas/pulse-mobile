// The band card's freshness on the in-memory store.
import { describe, expect, it } from "vitest";
import { MemoryStore } from "@/data/memory";
import type { Profile } from "@/data/types";
import { BAND_STALE_S, bandFreshness, getBandFreshness } from "./bandExtras";
import type { QueryCtx } from "./ctx";

const TZ = "Asia/Kolkata";
const NOW = Date.parse("2026-10-02T14:00:00+05:30") / 1000;
const PROFILE: Profile = { birthDate: "1990-01-01", sex: "male", maxHr: 183, heightCm: 178, timeZone: TZ };

const ctxFor = (store: MemoryStore, lastSyncTs: number | null): QueryCtx => ({
  store,
  profile: PROFILE,
  timeZone: TZ,
  today: "2026-10-02",
  now: NOW,
  sync: { lastSyncTs, firstDay: null, lastError: null },
});

describe("bandFreshness", () => {
  it("is fresh while the last import came soon after the newest sample", () => {
    expect(bandFreshness(NOW - 600, NOW, NOW)).toEqual({ lastHrTs: NOW - 600, asOf: NOW, stale: false });
    expect(bandFreshness(NOW - BAND_STALE_S + 1, NOW, NOW).stale).toBe(false);
  });

  it("is stale once an import ran BAND_STALE_S or more after the newest sample", () => {
    expect(bandFreshness(NOW - BAND_STALE_S, NOW, NOW).stale).toBe(true);
    expect(bandFreshness(NOW - 2 * 86400, NOW, NOW).stale).toBe(true);
  });

  it("never blames the band for a late sync, or claims anything without data", () => {
    // Old sample, but no import since: the gap may be Pulse's, not the band's.
    expect(bandFreshness(NOW - 5 * 3600, NOW - 5 * 3600 + 60, NOW).stale).toBe(false);
    expect(bandFreshness(null, NOW, NOW)).toEqual({ lastHrTs: null, asOf: NOW, stale: false });
    expect(bandFreshness(NOW - 5 * 3600, null, NOW).stale).toBe(false);
  });
});

describe("getBandFreshness", () => {
  it("reads the newest stored heart rate", async () => {
    const store = new MemoryStore();
    expect(await getBandFreshness(ctxFor(store, NOW))).toEqual({ lastHrTs: null, asOf: NOW, stale: false });
    await store.putHr([
      { ts: NOW - 4 * 3600, bpm: 61 },
      { ts: NOW - 4 * 3600 + 60, bpm: 63 },
    ]);
    expect(await getBandFreshness(ctxFor(store, NOW))).toEqual({ lastHrTs: NOW - 4 * 3600 + 60, asOf: NOW, stale: true });
    await store.putHr([{ ts: NOW - 120, bpm: 70 }]);
    expect(await getBandFreshness(ctxFor(store, NOW))).toEqual({ lastHrTs: NOW - 120, asOf: NOW, stale: false });
  });
});
