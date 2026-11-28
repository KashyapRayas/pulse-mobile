// The composer's "+": a floating sheet of topics, as Claude's "Add to chat" and ChatGPT's tools menu. Each tile sends a
// focused question that leads the coach to one of its lookups, as typing it would.
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Activity, Dumbbell, HeartPulse, Moon, NotebookPen, Sparkles, TrendingUp, type LucideIcon } from "lucide-react-native";
import { Icon } from "@/ui/Icon";
import { DURATION } from "@/ui/motion";
import { Press } from "@/ui/Press";
import { Text } from "@/ui/Text";
import { Sheet } from "./Sheet";

export const TOPICS = ["today", "sleep", "workouts", "trends", "habits", "health"] as const;
export type Topic = (typeof TOPICS)[number];
const ICONS: Record<Topic, LucideIcon> = { today: Activity, sleep: Moon, workouts: Dumbbell, trends: TrendingUp, habits: NotebookPen, health: HeartPulse };

export function ToolsSheet({ open, onClose, onAsk, disabled }: { open: boolean; onClose: () => void; onAsk: (question: string) => void; disabled?: boolean }) {
  const { t } = useTranslation("coach");
  return (
    <Sheet open={open} onClose={onClose} icon={Sparkles} title={t("tools.title")} subtitle={t("tools.subtitle")}>
      <View className="flex-row flex-wrap gap-2">
        {TOPICS.map((topic, i) => (
          // Three to a row: a third of the width less the two gaps.
          <Animated.View key={topic} entering={FadeInDown.delay(60 + i * 35).duration(DURATION.enter)} style={{ width: "31.8%" }}>
            <Press
              accessibilityRole="button"
              accessibilityHint={t(`tools.ask.${topic}`)}
              disabled={disabled}
              onPress={() => {
                onClose();
                onAsk(t(`tools.ask.${topic}`));
              }}
              activeScale={0.95}
              activeBg="bg-fill-hover"
              className="h-24 items-center justify-center gap-2 rounded-2xl bg-secondary px-2"
              style={disabled ? { opacity: 0.45 } : undefined}
            >
              <Icon icon={ICONS[topic]} size={22} tone="coach-text" />
              <Text numberOfLines={1} className="text-meta font-medium text-foreground">
                {t(`tools.label.${topic}`)}
              </Text>
            </Press>
          </Animated.View>
        ))}
      </View>
    </Sheet>
  );
}
