// Home's header actions (pulse src/components/shells/HomeHeader.tsx): metric search, the web's ⌘K and Linear mobile's
// magnifier, beside the sync status. Shared by Home and its skeleton so the header does not shift when Home loads.
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react-native";
import { dayHref } from "@/lib/url";
import { Icon } from "@/ui/Icon";
import { push } from "@/ui/navigate";
import { Press } from "@/ui/Press";
import { useNarrow } from "@/ui/shells/layout";
import { useShellCalendar } from "@/ui/shells/ShellStatus";
import { SyncStatus } from "@/ui/shells/SyncStatus";

/** Home's header actions: metric search (the web's ⌘K, Linear mobile's magnifier) beside the sync status. */
export function HomeHeaderActions({ d }: { d: string }) {
  const { t } = useTranslation("home");
  const { today } = useShellCalendar();
  // The magnifier takes the room the "12m" had: the sync text shows only where the header has space for both.
  const { width } = useNarrow();
  return (
    <View className="flex-row items-center justify-end gap-0.5">
      <Press activeBg="bg-fill-faint" accessibilityRole="button" accessibilityLabel={t("search.open")} onPress={() => push(dayHref("/search", d, today))} hitSlop={4} className="size-10 items-center justify-center rounded-full">
        <Icon icon={Search} size={20} tone="foreground" strokeWidth={1.75} />
      </Press>
      <SyncStatus hideText={width < 430} />
    </View>
  );
}
