import { i18n } from "@/i18n/config";
import { View } from "react-native";
import { Sparkle } from "lucide-react-native";
import { Glass } from "../Glass";
import { haptic } from "../haptics";
import { Icon } from "../Icon";
import { FAB_SIZE, TAB_ROOTS, useTabBarBottom } from "./layout";
import { push } from "../navigate";
import { Press } from "../Press";

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
      {/* The tab bar's own glass and one monoline glyph in the text colour, as Linear's round search beside its toolbar:
          no tinted rim or gradient, so it reads as part of the bar rather than a badge on it. */}
      <Glass radius={FAB_SIZE / 2} style={{ width: FAB_SIZE, height: FAB_SIZE, alignItems: "center", justifyContent: "center" }}>
        <Icon icon={Sparkle} size={22} tone="foreground" strokeWidth={1.75} />
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
