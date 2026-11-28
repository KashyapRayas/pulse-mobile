// A run of the coach's lookups as one line, as Claude folds its tool use: while it works, a spinner and the current step
// under a shimmer ("Reading your sleep…"); once done, "Looked at 3 things", which opens to the steps, each with a check
// (or a cross when it failed).
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useDerivedValue, withTiming } from "react-native-reanimated";
import { Check, ChevronDown, X } from "lucide-react-native";
import type { Step } from "@/coach/parts";
import { i18n } from "@/i18n/config";
import { cn } from "@/ui/cn";
import { haptic } from "@/ui/haptics";
import { Icon } from "@/ui/Icon";
import { DURATION, EASE } from "@/ui/motion";
import { Press } from "@/ui/Press";
import { Text } from "@/ui/Text";
import { Shimmer, Spinner } from "./Motion";

/** The tools with their own lines (`coach:running.<tool>`, `coach:steps.<tool>`); any other reads the default. */
const KNOWN = ["get_day", "get_sleep", "get_activity", "get_trend", "get_activities", "get_journal_impacts", "get_health", "get_report", "get_profile"];
const key = (name: string) => (KNOWN.includes(name) ? name : "default");

export const runningLabel = (name: string) => i18n.t(`coach:running.${key(name)}` as "coach:running.default");
const doneLabel = (name: string) => i18n.t(`coach:steps.${key(name)}` as "coach:steps.default");

export function ToolSteps({ steps }: { steps: Step[] }) {
  const { t } = useTranslation("coach");
  const [open, setOpen] = useState(false);
  const turn = useDerivedValue(() => withTiming(open ? 180 : 0, { duration: DURATION.fast, easing: EASE.standard }));
  const chevron = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value}deg` }] }));
  const running = steps.find((s) => s.state === "running");

  if (running)
    return (
      <Animated.View key="running" entering={FadeIn.duration(DURATION.fast)} accessibilityLiveRegion="polite" className="min-h-6 flex-row items-center gap-2">
        <Spinner />
        <Shimmer>
          <Text className="text-meta text-foreground">{runningLabel(running.name)}</Text>
        </Shimmer>
      </Animated.View>
    );

  // A failed lookup stays visible without opening the list: a red mark, and the failure line under the summary of the
  // ones that worked (the old chat showed a line per failed tool).
  const ok = steps.filter((s) => s.state !== "failed");
  const failed = ok.length < steps.length;
  const summary = !ok.length ? t("chat.toolFailed") : ok.length === 1 ? doneLabel(ok[0].name) : t("steps.summary", { count: ok.length });
  return (
    <Animated.View key="done" entering={FadeIn.duration(DURATION.fast)} className="gap-1">
      <Press
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => {
          haptic.toggle(!open);
          setOpen(!open);
        }}
        className="min-h-8 flex-row items-center gap-2 self-start py-1"
      >
        <View className={cn("size-4 items-center justify-center rounded-full", failed ? "bg-recovery-red/15" : "bg-coach/15")}>
          <Icon icon={failed ? X : Check} size={11} tone={failed ? "recovery-red-text" : "coach-text"} strokeWidth={2.5} />
        </View>
        <Text className="text-meta text-muted-foreground">{summary}</Text>
        <Animated.View style={chevron}>
          <Icon icon={ChevronDown} size={14} tone="muted-foreground" />
        </Animated.View>
      </Press>
      {failed && ok.length > 0 && <Text className="pl-6 text-meta text-recovery-red-text">{t("chat.toolFailed")}</Text>}
      {open && (
        <Animated.View entering={FadeIn.duration(DURATION.fast)} exiting={FadeOut.duration(DURATION.fast)} className="ml-2 border-l border-border pl-4">
          {steps.map((s, i) => (
            <View key={i} className="min-h-7 flex-row items-center gap-2">
              <Icon icon={s.state === "failed" ? X : Check} size={13} tone={s.state === "failed" ? "recovery-red-text" : "optimal-text"} strokeWidth={2.25} />
              <Text className="text-meta text-foreground-secondary">{s.state === "failed" ? t("chat.toolFailed") : doneLabel(s.name)}</Text>
            </View>
          ))}
        </Animated.View>
      )}
    </Animated.View>
  );
}
