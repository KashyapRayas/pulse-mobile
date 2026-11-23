import { useTranslation } from "react-i18next";
import { useEffect, useState, type ComponentProps } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import type { Tabs } from "expo-router";
import { HeartPulse, Menu, NotebookPen, type LucideIcon } from "lucide-react-native";
import { alpha } from "../color";
import { Glass } from "../Glass";
import { haptic } from "../haptics";
import { Gradient } from "../Gradient";
import { HomeChart } from "../icons";
import { LiveWorkoutBar } from "./LiveWorkoutBar";
import { Icon } from "../Icon";
import { useTheme } from "../theme";
import { CheckInAction } from "./CheckInAction";
import { TAB_BAR_HEIGHT, useBottomClearance, useTabBarBottom } from "./layout";
import { Press } from "../Press";
import { DURATION, SPRING } from "../motion";

/** A capsule, as Linear's toolbar (LN10); the pill and each tab sit 4 px inside it, fully rounded too. */
const BAR_RADIUS = TAB_BAR_HEIGHT / 2;
const LENS_RADIUS = BAR_RADIUS - 4;

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

// Home, Health, Journal, More, as WHOOP's bar (an activity starts from Home, docs/workout-tracker/whoop-ui.md). The
// route file of each is app/(tabs)/<route>.tsx.
export const TABS: { route: string; labelKey: "tabs.home" | "tabs.health" | "tabs.journal" | "tabs.more"; icon: LucideIcon }[] = [
  { route: "index", labelKey: "tabs.home", icon: HomeChart },
  { route: "health", labelKey: "tabs.health", icon: HeartPulse },
  { route: "journal", labelKey: "tabs.journal", icon: NotebookPen },
  { route: "more", labelKey: "tabs.more", icon: Menu },
];

/**
 * The active item's pill: one flat, faintly lit shape that glides between items on a critically damped spring, as
 * Linear's toolbar marks its current tab (a 150 ms timing with reduced motion).
 */
function Lens({ index, itemWidth }: { index: number; itemWidth: number }) {
  const { c } = useTheme();
  const x = useSharedValue(index * itemWidth);
  const reduced = useReducedMotion();
  useEffect(() => {
    x.value = reduced ? withTiming(index * itemWidth, { duration: DURATION.fast }) : withSpring(index * itemWidth, SPRING.snappy);
  }, [index, itemWidth, x, reduced]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }], opacity: index < 0 ? 0 : 1 }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 4, top: 4, bottom: 4, width: itemWidth, borderRadius: LENS_RADIUS, overflow: "hidden" }, style]}>
      <View style={{ flex: 1, backgroundColor: alpha(c.foreground, 0.09) }} />
    </Animated.View>
  );
}

/**
 * Phone tab bar: a 56 px glass capsule of icons, for expo-router's <Tabs tabBar>. Linear's toolbar carries no labels
 * (LN10): each tab's name is its accessibility label, and the screen's own left-aligned title says where you are.
 */
function Bar({ state, navigation, current: shown }: TabBarProps & { current: number }) {
  const { t } = useTranslation(["ui", "workouts"]);
  const [width, setWidth] = useState(0);
  // The tapped tab lights up (lens, icon, label) in its own small render; the tab's screen renders a frame later. One
  // render for both would hold the feedback until the whole screen had rendered.
  const [tapped, setTapped] = useState<number | null>(null);
  if (tapped !== null && tapped === shown) setTapped(null);
  const current = tapped ?? shown;
  const itemWidth = Math.max(0, (width - 8) / TABS.length);
  return (
    <Glass radius={BAR_RADIUS} accessibilityRole="tablist" accessibilityLabel={t("tabs.primary")} onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height: TAB_BAR_HEIGHT, flex: 1, minWidth: 0, padding: 4 }}>
      {width > 0 && <Lens index={current} itemWidth={itemWidth} />}
      <View className="h-full flex-row">
        {TABS.map(({ route, labelKey, icon }, i) => {
          const label = t(labelKey);
          const route_ = state.routes.find((r) => r.name === route);
          const on = i === current;
          return (
            <Press
              activeScale={1.06}
              key={route}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: on }}
              onPress={() => {
                if (!route_) return;
                const event = navigation.emit({ type: "tabPress", target: route_.key, canPreventDefault: true });
                if (!on && !event.defaultPrevented) {
                  haptic.select();
                  setTapped(i);
                  requestAnimationFrame(() => navigation.navigate(route_.name));
                }
              }}
              className="h-full min-w-0 flex-1 items-center justify-center rounded-full"
            >
              <Icon icon={icon} size={22} tone={on ? "foreground" : "muted-foreground"} strokeWidth={on ? 2 : 1.75} />
            </Press>
          );
        })}
      </View>
    </Glass>
  );
}

/**
 * The tab bar and the round action, floating over the content at the bottom of the screen (tab roots), exactly as the
 * web's (spec §4.2). Their glass blurs the screen in view on iOS; Android draws the glass fill opaque (Glass).
 */
export function TabBar(props: TabBarProps) {
  const bottom = useTabBarBottom();
  const route = props.state.routes[props.state.index];
  const current = TABS.findIndex((t) => t.route === route?.name);
  return (
    <>
      <ScrollEdge />
      <View pointerEvents="box-none" className="absolute inset-x-3 gap-2" style={{ bottom }}>
        <LiveWorkoutBar />
        <View pointerEvents="box-none" className="flex-row justify-end gap-2">
          <Bar {...props} current={current} />
          <CheckInAction />
        </View>
      </View>
    </>
  );
}

/**
 * The scroll edge under the floating bar: content fades into the background as it nears the screen's foot instead of
 * running hard under the glass (Linear's scroll-edge treatment, done as a gradient: a variable blur would re-blur the
 * page every frame on Android, see Glass).
 */
function ScrollEdge() {
  const { c } = useTheme();
  return (
    <View pointerEvents="none" className="absolute inset-x-0 bottom-0" style={{ height: useBottomClearance() }}>
      <Gradient from={alpha(c.background, 0)} to={alpha(c.background, 0.92)} angle="y" />
    </View>
  );
}
