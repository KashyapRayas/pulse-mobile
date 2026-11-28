// The web's Sonner toasts (pulse components/ui/sonner.tsx, `toast.success` / `toast.error` from "sonner"), once for the
// whole app. `toast.success(text)` works from anywhere (a sheet that has just closed); <ToastHost /> is mounted once in
// AppProviders. As Sonner with the web's config: popover fill and text, a 1 px border, a 16 px icon in the text colour
// (success and error alike: no rich colours), 13 px / 500 text, 16 px padding, the full width of a phone less its 16 px
// offset, at the foot, for 4 s. One is shown at a time, and a new one replaces it.
import { useEffect, useSyncExternalStore } from "react";
import { View } from "react-native";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
import { CircleCheck, OctagonX } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { haptic } from "./haptics";
import { Icon } from "./Icon";
import { usePanelStyle } from "./Panel";
import { Text } from "./Text";
import { DURATION } from "./motion";
import { LineIcon } from "./LineIcon";

type Kind = "success" | "error";
type Current = { id: number; kind: Kind; text: string } | null;

const SHOWN_MS = 4000;
let current: Current = null;
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};

const show = (kind: Kind, text: string) => {
  current = { id: ++seq, kind, text };
  emit();
};

/** Sonner's `toast`: the success haptic or the error haptic goes with it. */
export const toast = {
  success: (text: string) => {
    haptic.success();
    show("success", text);
  },
  error: (text: string) => {
    haptic.error();
    show("error", text);
  },
};

export function ToastHost() {
  const t = useSyncExternalStore(subscribe, () => current);
  const panel = usePanelStyle({ ring: null, shadow: "toast" });
  // At the top, under the header row: a toast at the foot covered a page's Save button and the chat's composer, and hid
  // behind the keyboard (LN11).
  const top = useSafeAreaInsets().top + 56;
  // One message at a time: each replaces the last, and clears itself after 4 s.
  useEffect(() => {
    if (!t) return;
    const id = t.id;
    const timer = setTimeout(() => {
      if (current?.id === id) {
        current = null;
        emit();
      }
    }, SHOWN_MS);
    return () => clearTimeout(timer);
  }, [t]);
  if (!t) return null;
  return (
    <View pointerEvents="none" className="absolute inset-x-0 px-4" style={{ top }}>
      <Animated.View
        key={t.id}
        entering={FadeInDown.duration(DURATION.enter)}
        exiting={FadeOutUp.duration(DURATION.fast)}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        className="max-w-full flex-row items-start gap-2 self-center rounded-2xl border border-border bg-popover py-3 pl-3 pr-4"
        style={panel}
      >
        <LineIcon step="meta"><Icon icon={t.kind === "success" ? CircleCheck : OctagonX} size={18} tone={t.kind === "success" ? "optimal-text" : "recovery-red-text"} strokeWidth={2} /></LineIcon>
        <Text className="shrink text-meta font-medium text-popover-foreground">{t.text}</Text>
      </Animated.View>
    </View>
  );
}
