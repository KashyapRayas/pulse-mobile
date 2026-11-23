import { i18n } from "@/i18n/config";
import { View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { BotMessageSquare } from "lucide-react-native";
import { Glass } from "../Glass";
import { haptic } from "../haptics";
import { Icon } from "../Icon";
import { useTheme } from "../theme";
import { FAB_SIZE, TAB_ROOTS, useTabBarBottom } from "./layout";
import { push } from "../navigate";
import { Press } from "../Press";

/** The coach's glyph (More's Coach row uses the same) in a 30 px circle with the indigo-to-blue rim. */
function Monogram() {
  const { c } = useTheme();
  return (
    <View accessibilityElementsHidden className="size-[30px] items-center justify-center">
      <Svg width={30} height={30} style={{ position: "absolute" }}>
        <Defs>
          <LinearGradient id="rim" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={c["action-rim-from"]} />
            <Stop offset="1" stopColor={c["action-rim-to"]} />
          </LinearGradient>
        </Defs>
        <Circle cx={15} cy={15} r={14.25} fill={c["action-face"]} stroke="url(#rim)" strokeWidth={1.5} />
      </Svg>
      <Icon icon={BotMessageSquare} size={16} tone="foreground" strokeWidth={1.9} />
    </View>
  );
}

/**
 * The round action at the end of the tab bar (spec §4.2.1, LN16): the AI coach. The tab bar's third tab is the
 * Journal, so this is the one way to the chat from anywhere; it opens the coach over the screen you are on (its setup
 * first, until a provider key is saved).
 */
export function CoachAction({ onPress }: { onPress?: () => void }) {
  return (
    <Press
      activeScale={1.05}
      accessibilityRole="button"
      accessibilityLabel={i18n.t("coach:title")}
      onPress={() => {
        haptic.tap();
        (onPress ?? (() => push("/coach")))();
      }}
    >
      <Glass radius={FAB_SIZE / 2} action style={{ width: FAB_SIZE, height: FAB_SIZE, alignItems: "center", justifyContent: "center" }}>
        <Monogram />
      </Glass>
    </Press>
  );
}

/**
 * Floats alone on detail screens (spec §4.2). Not on the tab roots (the tab bar carries it there), Settings, the coach
 * itself or the dev kit (except its detail demo, which shows how a detail screen looks).
 */
export function showsCoachAction(pathname: string) {
  return !(TAB_ROOTS.includes(pathname) || pathname.startsWith("/settings") || pathname.startsWith("/coach") || (pathname.startsWith("/dev") && !pathname.startsWith("/dev/kit/detail")));
}

/** The action floating alone at the foot of a detail screen, where the tab bar would sit. Rendered by <ScreenScroll>. */
export function FloatingCoachAction() {
  const bottom = useTabBarBottom();
  return (
    <View pointerEvents="box-none" className="absolute right-3" style={{ bottom }}>
      <CoachAction />
    </View>
  );
}
