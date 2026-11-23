// The opening: takes over from the native splash screen, beats the mark once (a lub-dub, docs/design/brand.md "the
// mark's natural motion is a single lub-dub"), then fades to the first screen.
//
// Its first frame is the native splash: the expo-splash-screen plugin (app.json) centres a square `imageWidth` box on
// the whole window, the mark filling it (assets/brand/splash-icon.svg and splash-icon-dark.svg, drawn in the
// MARK_VIEWBOX), on the scheme's splash colour. This overlay draws the same mark in the same box at the window's
// centre, so the native splash hides with no fade over an identical picture. With reduce motion the overlay never
// shows: the native splash hands straight over.
import { useEffect, useState } from "react";
import { StyleSheet, useColorScheme } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import Animated, { Easing, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withTiming } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { MARK_MITER, MARK_VIEWBOX, STROKE, markPath } from "@/ui/brand";

/** The splash colours and the mark's size: app.json's expo-splash-screen `backgroundColor`, `dark.backgroundColor`, `imageWidth`. */
const GROUND = { light: "#f6f8f9", dark: "#101518" } as const;
/** The splash images' ink (splash-icon.svg, splash-icon-dark.svg). */
const INK = { light: "#15171a", dark: "#eef0f3" } as const;
const MARK = 64;

/** One lub-dub: a 6 % swell and back, then a 3 % one 160 ms after the first began. */
const EASE = Easing.bezier(0.37, 0, 0.63, 1);
const OUT_MS = 150;
const BACK_MS = 180;
/** The overlay fades as the dub settles: 520 ms in, 300 ms long, so the whole opening is 820 ms. */
const FADE_AT_MS = 520;
const FADE_MS = 300;

/** Mounted over the app from the first render; `ready` is when the app below can paint its first screen. */
export function Opening({ ready }: { ready: boolean }) {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const reduce = useReducedMotion();
  const [laidOut, setLaidOut] = useState(false);
  const [done, setDone] = useState(false);
  const scale = useSharedValue(1);
  const shown = useSharedValue(1);

  useEffect(() => {
    if (!ready || !laidOut) return;
    // The overlay is on screen under the native splash: the splash goes at once (no fade, app/_layout.tsx), the picture
    // does not change.
    SplashScreen.hide();
    if (reduce) return;
    scale.value = withSequence(
      withTiming(1.06, { duration: OUT_MS, easing: EASE }),
      withTiming(1, { duration: BACK_MS, easing: EASE }),
      withTiming(1.03, { duration: OUT_MS, easing: EASE }),
      withTiming(1, { duration: BACK_MS, easing: EASE }),
    );
    shown.value = withDelay(
      FADE_AT_MS,
      withTiming(0, { duration: FADE_MS, easing: Easing.bezier(0.2, 0, 0, 1) }, (finished) => {
        if (finished) runOnJS(setDone)(true);
      }),
    );
  }, [ready, laidOut, reduce, scale, shown]);

  const beatStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const overlayStyle = useAnimatedStyle(() => ({ opacity: shown.value }));

  if (done || (reduce && ready && laidOut)) return null;
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={() => setLaidOut(true)}
      style={[StyleSheet.absoluteFill, { backgroundColor: GROUND[scheme], alignItems: "center", justifyContent: "center" }, overlayStyle]}
    >
      <Animated.View style={[{ width: MARK, height: MARK }, beatStyle]}>
        <Svg viewBox={MARK_VIEWBOX} width={MARK} height={MARK}>
          <Path d={markPath(STROKE.bold)} fill="none" stroke={INK[scheme]} strokeWidth={STROKE.bold} strokeMiterlimit={MARK_MITER} />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}
