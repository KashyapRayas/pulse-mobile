// My Day's "+": a white key that opens the action menu (the reference app, home-08), ported from pulse
// (app)/_lib/PlusMenu.tsx. The key drops the kit's menu, as the web's dropdown; app/plus.tsx keeps the same actions as a
// page for links that open it. Start activity records a workout on the phone, Add activity logs a past one
// (docs/workout-tracker/whoop-ui.md); entries without a data source in Pulse (Strength trainer, Share live) are left out.
import { View } from "react-native";
import { router, type Href } from "expo-router";
import { useTranslation } from "react-i18next";
import { NotebookPen, Plus, Timer, type LucideIcon } from "lucide-react-native";
import { Gradient } from "@/ui/Gradient";
import { haptic } from "@/ui/haptics";
import { Icon } from "@/ui/Icon";
import { TaskPage } from "@/ui/shells/TaskPage";
import { Text } from "@/ui/Text";
import { useTheme } from "@/ui/theme";
import { workoutLogHref } from "@/lib/url";
import { Press } from "@/ui/Press";
import { push } from "@/ui/navigate";
import { MenuPanel, useMenu } from "@/ui/Menu";
import { TYPE } from "@/ui/type";

/**
 * The ~34 pt key with a soft top light; the hit area grows to 44 px without moving it. It drops the kit's menu under
 * itself (three actions do not need a page of their own); the day it adds to is in its label.
 */
export function PlusKey({ label, day }: { label: string; day?: string }) {
  const { c } = useTheme();
  const { t } = useTranslation(["home", "workouts"]);
  const { ref, anchor, open, close } = useMenu();
  const go = (href: string) => {
    close();
    push(href);
  };
  return (
    <>
      <Press
        ref={ref}
        activeScale={0.96}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: anchor !== null }}
        onPress={() => {
          haptic.tap();
          open();
        }}
        hitSlop={5}
        className="size-10 items-center justify-center overflow-hidden rounded-full"
      >
        <Gradient from={c["key-from"]} to={c["key-to"]} angle="y" />
        <Icon icon={Plus} size={20} tone="key-foreground" strokeWidth={2.25} />
      </Press>
      <MenuPanel anchor={anchor} onClose={close} align="end" className="min-w-56">
        <PlusRow icon={Timer} label={t("workouts:home.start")} onPress={() => go("/workout-live")} />
        <PlusRow
          icon={Plus}
          label={t("activities.add")}
          onPress={() => go(workoutLogHref({ day }))}
        />
        <PlusRow icon={NotebookPen} label={t("add.completeJournal")} onPress={() => go("/checkin")} />
      </MenuPanel>
    </>
  );
}

function PlusRow({ icon, label, onPress }: { icon: LucideIcon; label: string; onPress: () => void }) {
  return (
    <Press accessibilityRole="menuitem" onPress={onPress} activeBg="bg-fill-hover" className="h-11 flex-row items-center gap-3 rounded-lg px-3">
      <Icon icon={icon} size={18} tone="foreground-secondary" />
      <Text className="text-body text-popover-foreground">{label}</Text>
    </Press>
  );
}

/** The sheet's body: "Add activity" opens the form for a past one, "Complete your journal" opens the check-in. */
export function PlusPage({ label, day }: { label: string; day?: string }) {
  const { t } = useTranslation(["home", "workouts"]);
  const item = "h-12 flex-row items-center gap-3 rounded-xl px-3";
  return (
    <TaskPage title={label}>
      <View accessibilityRole="menu">
        {/* Start activity first, as WHOOP's menu: replaces the menu with the start screen. */}
        <Press activeBg="bg-fill-pressed" accessibilityRole="menuitem" onPress={() => router.replace("/workout-live" as Href)} className={item}>
          <Icon icon={Timer} size={20} tone="foreground-secondary" strokeWidth={1.75} />
          <Text className={TYPE.rowTitle}>{t("workouts:home.start")}</Text>
        </Press>
        <Press activeBg="bg-fill-pressed" accessibilityRole="menuitem" onPress={() => router.replace(workoutLogHref({ day }) as Href)} className={item}>
          <Icon icon={Plus} size={20} tone="foreground-secondary" strokeWidth={1.75} />
          <Text className={TYPE.rowTitle}>{t("activities.add")}</Text>
        </Press>
        {/* Replaces the menu with the check-in rather than stacking a second sheet on it. */}
        <Press activeBg="bg-fill-pressed" accessibilityRole="menuitem" onPress={() => router.replace("/checkin" as Href)} className={item}>
          <Icon icon={NotebookPen} size={20} tone="foreground-secondary" strokeWidth={1.75} />
          <Text className={TYPE.rowTitle}>{t("add.completeJournal")}</Text>
        </Press>
      </View>
    </TaskPage>
  );
}
