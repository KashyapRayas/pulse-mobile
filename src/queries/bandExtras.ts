// The band card's freshness (Settings › Live heart rate), Pulse only. Health Connect has no battery record and the
// Fitbit Air offers no Bluetooth Battery Service, so Pulse can't show a charge level (docs/features/device-battery.md).
// It can show how old the newest stored heart rate is, and say so when the band went quiet long before the last import:
// a band that stopped sending for hours is likely flat, off the wrist or out of range.
import type { QueryCtx } from "./ctx";

/** Quiet this long before the last import (seconds): the card says the band may need charging. */
export const BAND_STALE_S = 3 * 3600;

export type BandFreshness = {
  /** Unix seconds of the newest stored heart-rate sample; null before any. */
  lastHrTs: number | null;
  /** Unix seconds the query ran (the card's "12 minutes ago" is measured from here, not the render's clock). */
  asOf: number;
  /** The last import came at least BAND_STALE_S after that sample, so the gap is the band's, not a late sync. */
  stale: boolean;
};

/** Pure part: stale only when an import ran well after the newest sample (a late sync is not the band's fault). */
export function bandFreshness(lastHrTs: number | null, lastSyncTs: number | null, asOf: number): BandFreshness {
  const stale = lastHrTs !== null && lastSyncTs !== null && lastSyncTs - lastHrTs >= BAND_STALE_S;
  return { lastHrTs, asOf, stale };
}

export async function getBandFreshness(ctx: QueryCtx): Promise<BandFreshness> {
  const bounds = await ctx.store.hrBounds();
  return bandFreshness(bounds?.last ?? null, ctx.sync.lastSyncTs, ctx.now);
}
