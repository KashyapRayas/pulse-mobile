// The composer's "+": a floating sheet of topics, as Claude's "Add to chat" and ChatGPT's tools menu, laid out as a
// Linear sheet: one group of inset rows (an icon, the topic, the question it asks, a chevron) with hairlines between.
// Each row sends its focused question, which leads the coach to one of its lookups, as typing it would.
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { Activity, ChevronRight, Dumbbell, HeartPulse, Moon, NotebookPen, TrendingUp, type LucideIcon } from "lucide-react-native";
import { cn } from "@/ui/cn";
import { Icon } from "@/ui/Icon";
import { Press } from "@/ui/Press";
import { Text } from "@/ui/Text";
import { TYPE } from "@/ui/type";
import { Sheet } from "./Sheet";

export const TOPICS = ["today", "sleep", "workouts", "trends", "habits", "health"] as const;
export type Topic = (typeof TOPICS)[number];
const ICONS: Record<Topic, LucideIcon> = { today: Activity, sleep: Moon, workouts: Dumbbell, trends: TrendingUp, habits: NotebookPen, health: HeartPulse };

export function ToolsSheet({ open, onClose, onAsk, disabled }: { open: boolean; onClose: () => void; onAsk: (question: string) => void; disabled?: boolean }) {
  const { t } = useTranslation("coach");
  return (
    <Sheet open={open} onClose={onClose} title={t("tools.title")} subtitle={t("tools.subtitle")}>
      <View className={cn("overflow-hidden rounded-2xl bg-secondary", disabled && "opacity-45")}>
        {TOPICS.map((topic, i) => (
          <View key={topic}>
            {/* The hairline starts where the row's text does, after the icon (Linear's inset list). */}
            {i > 0 && <View className="ml-12 h-px bg-border" />}
            <Press
              accessibilityRole="button"
              accessibilityHint={t(`tools.ask.${topic}`)}
              disabled={disabled}
              onPress={() => {
                onClose();
                onAsk(t(`tools.ask.${topic}`));
              }}
              activeBg="bg-fill-hover"
              className="min-h-14 flex-row items-center gap-3 px-4 py-3"
            >
              <Icon icon={ICONS[topic]} size={20} tone="foreground-secondary" strokeWidth={1.5} />
              <View className="min-w-0 flex-1 gap-1">
                <Text className={TYPE.rowTitle}>{t(`tools.label.${topic}`)}</Text>
                <Text numberOfLines={1} className={TYPE.rowSub}>
                  {t(`tools.ask.${topic}`)}
                </Text>
              </View>
              <Icon icon={ChevronRight} size={18} tone="muted-foreground" />
            </Press>
          </View>
        ))}
      </View>
    </Sheet>
  );
}
