// The welcome hero: the app's icon (the mark, a frame with the wordmark's heartbeat through it, on its near-black tile,
// assets/brand/icon.svg) over the wordmark. The tile beats about once a second like a resting heart, a lub then a
// smaller dub 160 ms later, each a 4 % swell and back. With reduce motion it holds still.
import { useEffect } from "react";
import { View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { ICON_COLORS, MARK_MITER, MARK_VIEWBOX, STROKE, Wordmark, markPath } from "@/ui/brand";
import { useTheme } from "@/ui/theme";

/** One beat, 1.2 s, eased in and out on every step. */
const BEAT_MS = 1200;
const EASE = Easing.bezier(0.37, 0, 0.63, 1);
const OUT_MS = 0.14 * BEAT_MS;
const BACK_MS = 0.18 * BEAT_MS;
/** The tile, with the launcher icon's corner (22.5 % of its side), and the mark at half its side. */
const TILE = 96;
const MARK = 48;

/** A lub (4 %) and a dub (2.5 %) 160 ms apart, then rest, forever. */
const lubDub = () =>
  withRepeat(
    withSequence(
      withTiming(1.04, { duration: OUT_MS, easing: EASE }),
      withTiming(1, { duration: BACK_MS, easing: EASE }),
      withTiming(1.025, { duration: OUT_MS, easing: EASE }),
      withTiming(1, { duration: BACK_MS, easing: EASE }),
      withTiming(1, { duration: BEAT_MS - 2 * (OUT_MS + BACK_MS) }),
    ),
    -1,
  );

export function HeartbeatMark() {
  const { c, scheme } = useTheme();
  const reduce = useReducedMotion();
  const scale = useSharedValue(1);
  useEffect(() => {
    if (!reduce) scale.value = withDelay(300, lubDub());
  }, [reduce, scale]);
  const beat = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View accessibilityRole="image" accessibilityLabel="Pulse" className="items-center gap-7">
      <Animated.View
        style={[
          { width: TILE, height: TILE, borderRadius: TILE * 0.225, backgroundColor: ICON_COLORS.tile, alignItems: "center", justifyContent: "center" },
          // On the dark ground the tile is nearly the ground's colour: a hairline keeps its edge.
          scheme === "dark" && { borderWidth: 1, borderColor: c.border },
          beat,
        ]}
      >
        <Svg viewBox={MARK_VIEWBOX} width={MARK} height={MARK}>
          <Path d={markPath(STROKE.bold)} fill="none" stroke={ICON_COLORS.ink} strokeWidth={STROKE.bold} strokeMiterlimit={MARK_MITER} />
        </Svg>
      </Animated.View>
      <Wordmark height={22} />
    </View>
  );
}
