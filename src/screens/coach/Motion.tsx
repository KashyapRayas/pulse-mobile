// The coach's small motions (docs/features/chat-experience.md): a light that sweeps across a working line, a spinner, a
// breathing mark and the caret at the end of a streaming answer. Each runs on the UI thread and stands still under
// Remove animations (reduced motion).
import { useEffect, useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { cancelAnimation, Easing, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming, type SharedValue } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { alpha } from "@/ui/color";
import { useTheme } from "@/ui/theme";

/** The coach's quick timings: arrivals in 180 ms and springs that land without lingering (snappier than the kit's 300 ms enter). */
export const SNAP = 180;
export const SNAP_SPRING = { damping: 24, stiffness: 420, mass: 0.7 } as const;

/** One sweep of the shimmer, start to end. */
const SWEEP_MS = 1200;
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
  const { v } = useLoop(700, false, Easing.linear);
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
  const { v } = useLoop(800, true);
  const breathe = useAnimatedStyle(() => ({ opacity: interpolate(v.value, [0, 1], [1, 0.55]), transform: [{ scale: interpolate(v.value, [0, 1], [1, 0.88]) }] }));
  return <Animated.View style={breathe}>{children}</Animated.View>;
}

/** One of TypingDots' dots: it hops and brightens when the wave passes it. */
function Dot({ v, i, reduced }: { v: SharedValue<number>; i: number; reduced: boolean }) {
  const hop = useAnimatedStyle(() => {
    if (reduced) return { opacity: 0.6 };
    // The wave reaches each dot a sixth of a cycle after the one before; a dot is up only for the first half of its turn.
    const phase = (((v.value - i / 6) % 1) + 1) % 1;
    const up = phase < 0.5 ? Math.sin(phase * 2 * Math.PI) : 0;
    return { opacity: 0.35 + 0.65 * up, transform: [{ translateY: -3 * up }] };
  });
  return <Animated.View className="size-1.5 rounded-full bg-coach" style={hop} />;
}

/** Three coach-blue dots in a wave under an answer that is still arriving, as a chat app's typing indicator. */
export function TypingDots() {
  const { v, reduced } = useLoop(900, false, Easing.linear);
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" className="h-6 flex-row items-center gap-1">
      {[0, 1, 2].map((i) => (
        <Dot key={i} v={v} i={i} reduced={reduced} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ clip: { overflow: "hidden" } });
