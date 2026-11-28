import { Easing } from "react-native-reanimated";

/** Motion durations in ms (spec §2.7), for animations a class cannot express. */
export const DURATION = {
  /** Press, tab lens, switches, chevrons and exits: the web's duration-150. */
  fast: 150,
  /** Disclosures and the calendar: the web's duration-200. */
  base: 200,
  /** The header's collapse (spec §4.3, 220 ms). */
  collapse: 220,
  /** Arrivals: the toast and the done screen. */
  enter: 300,
  /** A dashboard row lifting under the finger. */
  lift: 120,
} as const;

/** The web's easings (globals.css `--ease-standard`, `--ease-out-expo`, `--ease-in-quick`). */
export const EASE = {
  standard: Easing.bezier(0.2, 0, 0, 1),
  outExpo: Easing.bezier(0.16, 1, 0.3, 1),
  inQuick: Easing.bezier(0.4, 0, 1, 1),
};

/**
 * Springs for things the finger moves (docs/design/linear-mobile.md "Motion"). `snappy`: the tab lens gliding to the
 * tapped tab, critically damped so it lands without a wobble. `lift`: Linear's glass controls rise a touch under the
 * finger and settle back with a small, quick pulse.
 */
export const SPRING = {
  snappy: { damping: 26, stiffness: 340, mass: 0.8 },
  lift: { damping: 15, stiffness: 420, mass: 0.6 },
} as const;
