// The coach's small motions (docs/features/chat-experience.md): a light that sweeps across a working line, a spinner, a
// breathing mark and the caret at the end of a streaming answer. Each runs on the UI thread and stands still under
// Remove animations (reduced motion).
import { useEffect, useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { cancelAnimation, Easing, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { alpha } from "@/ui/color";
import { useTheme } from "@/ui/theme";

/** One sweep of the shimmer, start to end. */
const SWEEP_MS = 1700;
/** How much of the text the veil hides outside the band of light. */
const VEIL = 0.62;

/** Made once: a new easing on every render would restart the loop. */
const IN_OUT = Easing.inOut(Easing.ease);

/** A value that runs 0 → 1 for ever (or 0 → 1 → 0 with `reverse`), still at 0 under reduced motion. */
function useLoop(duration: number, reverse = false, easing = IN_OUT) {
  const reduced = useReducedMotion();
  const v = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    v.set(withRepeat(withTiming(1, { duration, easing }), -1, reverse));
    return () => cancelAnimation(v);
  }, [reduced, v, duration, reverse, easing]);
  return { v, reduced };
}

/**
 * A band of light sweeping left to right across text, as Claude and ChatGPT mark a line that is still working. The text
 * sits under a veil in the chat's own ground colour with a clear window in it; the veil, three times the text's width,
 * slides so the window crosses the words. Only for text on the plain ground (the chat), where the veil is invisible.
 */
export function Shimmer({ children }: { children: ReactNode }) {
  const { c } = useTheme();
  const [w, setW] = useState(0);
  const { v, reduced } = useLoop(SWEEP_MS, false);
  // The window's centre runs from just before the text to just after it: the veil's left edge from -1.8w to -0.2w.
  const slide = useAnimatedStyle(() => ({ transform: [{ translateX: interpolate(v.value, [0, 1], [-1.8 * w, -0.2 * w]) }] }));
  const veil = alpha(c.background, VEIL);
  const clear = alpha(c.background, 0);
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} className="shrink">
      {children}
      {!reduced && w > 0 && (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.clip]}>
          <Animated.View style={[{ width: w * 3, height: "100%" }, slide]}>
            <LinearGradient colors={[veil, veil, clear, veil, veil]} locations={[0, 0.4, 0.5, 0.6, 1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
          </Animated.View>
        </View>
      )}
    </View>
  );
}

/** A 16 px ring with a coach-blue arc turning on it: a tool call in progress. Still (the arc parked) under reduced motion. */
export function Spinner({ size = 16 }: { size?: number }) {
  const { c } = useTheme();
  const { v } = useLoop(850, false, Easing.linear);
  const turn = useAnimatedStyle(() => ({ transform: [{ rotate: `${v.value * 360}deg` }] }));
  const stroke = 2;
  const r = (size - stroke) / 2;
  const length = 2 * Math.PI * r;
  return (
    <Animated.View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[{ width: size, height: size }, turn]}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.border} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.coach} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${length * 0.28} ${length}`} />
      </Svg>
    </Animated.View>
  );
}

/** Its child grows and fades a little in and out, like breath: the coach mark while it thinks. */
export function Breathing({ children }: { children: ReactNode }) {
  const { v } = useLoop(1100, true);
  const breathe = useAnimatedStyle(() => ({ opacity: interpolate(v.value, [0, 1], [1, 0.55]), transform: [{ scale: interpolate(v.value, [0, 1], [1, 0.88]) }] }));
  return <Animated.View style={breathe}>{children}</Animated.View>;
}

/** The dot at the end of an answer that is still streaming. */
export function StreamCaret() {
  const { v } = useLoop(650, true);
  const pulse = useAnimatedStyle(() => ({ opacity: interpolate(v.value, [0, 1], [1, 0.25]) }));
  return <Animated.View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" className="size-2 rounded-full bg-coach" style={pulse} />;
}

const styles = StyleSheet.create({ clip: { overflow: "hidden" } });
