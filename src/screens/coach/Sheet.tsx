// The coach's floating sheet (docs/features/chat-experience.md): Family's card held off the screen's edges that springs
// up over a dim, laid out as a Linear sheet: a grabber, a left-aligned title over a muted line, a close circle, then the
// content (grouped rows). A drag down, a tap on the dim or Back closes it. Under reduced motion it fades instead.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { Extrapolation, interpolate, runOnJS, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X, type LucideIcon } from "lucide-react-native";
import { cn } from "@/ui/cn";
import { haptic } from "@/ui/haptics";
import { Icon } from "@/ui/Icon";
import { DURATION, EASE } from "@/ui/motion";
import { usePanelStyle } from "@/ui/Panel";
import { Press } from "@/ui/Press";
import { Text } from "@/ui/Text";
import { TYPE } from "@/ui/type";

/** Up quickly with the least give: a touch under critical damping, settled in about a quarter second. */
const RISE = { damping: 28, stiffness: 520, mass: 0.7 } as const;
/** Back into place after a drag that did not close it. */
const SETTLE = { damping: 26, stiffness: 340, mass: 0.8 } as const;
/** A drag further than this share of the card's height, or a flick faster than FLICK px/s, closes it. */
const CLOSE_AT = 0.28;
const FLICK = 900;
/** The card's gap to the screen's sides and to the safe area at the foot. */
const GAP = 12;

export type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  /** After the exit has played and the sheet is gone: the moment to focus a field under it. */
  onClosed?: () => void;
  children: ReactNode;
};

export function Sheet({ open, onClose, onClosed, title, subtitle, children }: SheetProps) {
  const { t } = useTranslation("common");
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const panel = usePanelStyle({ ring: "popover-ring" });
  // Mounted from the moment it opens until its exit has played.
  const [shown, setShown] = useState(open);
  if (open && !shown) setShown(true);
  const p = useSharedValue(0);
  const drag = useSharedValue(0);
  const height = useSharedValue(400);
  const afterClose = useRef(onClosed);
  useEffect(() => {
    afterClose.current = onClosed;
  }, [onClosed]);
  const gone = () => {
    setShown(false);
    afterClose.current?.();
  };

  useEffect(() => {
    if (!shown) return;
    if (open) {
      drag.set(0);
      haptic.select();
      p.set(reduced ? withTiming(1, { duration: DURATION.fast }) : withSpring(1, RISE));
    } else {
      p.set(
        withTiming(0, { duration: DURATION.fast, easing: EASE.inQuick }, (done) => {
          if (done) runOnJS(gone)();
        }),
      );
    }
  }, [open, shown, reduced, p, drag]);

  const pan = Gesture.Pan()
    .activeOffsetY(10)
    .failOffsetX([-24, 24])
    .onUpdate((e) => {
      // Down follows the finger; up gives a little, as a rubber band.
      drag.set(e.translationY > 0 ? e.translationY : e.translationY * 0.15);
    })
    .onEnd((e) => {
      if (e.translationY > height.value * CLOSE_AT || e.velocityY > FLICK) runOnJS(onClose)();
      else drag.set(withSpring(0, SETTLE));
    });

  const dim = useAnimatedStyle(() => ({ opacity: p.value * interpolate(drag.value, [0, height.value], [1, 0.4], Extrapolation.CLAMP) }));
  const card = useAnimatedStyle(() => {
    const away = height.value + insets.bottom + GAP * 2;
    if (reduced) return { opacity: p.value, transform: [{ translateY: drag.value }] };
    return { transform: [{ translateY: (1 - p.value) * away + drag.value }, { scale: interpolate(p.value, [0, 1], [0.94, 1], Extrapolation.CLAMP) }] };
  });

  if (!shown) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <GestureHandlerRootView style={styles.fill}>
        <Animated.View style={[StyleSheet.absoluteFill, dim]}>
          <Pressable accessibilityLabel={t("actions.close")} onPress={onClose} className="flex-1 bg-dim-strong" />
        </Animated.View>
        <GestureDetector gesture={pan}>
          <Animated.View
            accessibilityViewIsModal
            onLayout={(e) => height.set(e.nativeEvent.layout.height)}
            className="absolute overflow-hidden rounded-[28px] bg-popover px-4 pb-4 pt-2"
            style={[panel, { left: GAP, right: GAP, bottom: insets.bottom + GAP }, card]}
          >
            <View className="h-1 w-9 self-center rounded-full bg-border" />
            <View className="flex-row items-start gap-3 pb-4 pl-1 pt-2">
              <View className="min-w-0 flex-1 gap-1 pt-1">
                <Text accessibilityRole="header" className={cn(TYPE.navTitle, "text-popover-foreground")}>
                  {title}
                </Text>
                {!!subtitle && <Text className={TYPE.rowSub}>{subtitle}</Text>}
              </View>
              <Press accessibilityRole="button" accessibilityLabel={t("actions.close")} onPress={onClose} activeBg="bg-fill-hover" activeScale={0.92} className="size-9 items-center justify-center rounded-full bg-secondary">
                <Icon icon={X} size={16} tone="foreground-secondary" strokeWidth={2} />
              </Press>
            </View>
            {children}
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

/** A Family-style pill for a sheet's foot: secondary, or the one primary action. */
export function SheetButton({ label, onPress, primary, icon, disabled }: { label: string; onPress: () => void; primary?: boolean; icon?: LucideIcon; disabled?: boolean }) {
  return (
    <Press
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      activeScale={0.97}
      className={cn("h-12 flex-1 flex-row items-center justify-center gap-2 rounded-full", primary ? "bg-primary" : "bg-secondary", disabled && "opacity-40")}
    >
      {icon && <Icon icon={icon} size={17} tone={primary ? "primary-foreground" : "foreground"} strokeWidth={2} />}
      <Text className={cn("text-body font-semibold", primary ? "text-primary-foreground" : "text-foreground")}>{label}</Text>
    </Press>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
