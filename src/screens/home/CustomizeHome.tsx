// Customize Home (pulse src/app/(app)/_lib/CustomizeHome.tsx, spec §11 CH1): every Home section with a switch, and up
// and down buttons that move it within its own area (Under the dials, My Day, Dashboard). The score dials always lead.
// Save stores the layout on the phone (src/actions/homeLayout.ts); Reset to default puts the default back in the draft.
// A task page (app/customize-home.tsx), opened from the button at the end of Home.
import { useEffect, useState } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, SlidersHorizontal } from "lucide-react-native";
import { homeLayout, saveHomeLayout } from "@/actions/homeLayout";
import { dataChanged } from "@/state/app";
import { areaOf, HOME_AREAS, HOME_DEFAULT, moveSection, sameLayout, showSection, type HomeLayout, type HomeSectionKey } from "@/lib/homeLayout";
import { Button } from "@/ui/Button";
import { cn } from "@/ui/cn";
import { haptic } from "@/ui/haptics";
import { Icon } from "@/ui/Icon";
import { goBack, push } from "@/ui/navigate";
import { Press } from "@/ui/Press";
import { TaskPage, TaskSection } from "@/ui/shells/TaskPage";
import { Text } from "@/ui/Text";
import { TYPE } from "@/ui/type";
import { Switch } from "../settings/controls";

const ROW = "min-h-16 flex-row items-center gap-3 rounded-xl bg-foreground/[0.07] py-2 pl-4 pr-1";

/** The quiet button at the end of Home that opens Customize Home. */
export function CustomizeHomeButton() {
  const { t } = useTranslation("home");
  return (
    <Press activeBg="bg-fill-faint" accessibilityRole="button" onPress={() => push("/customize-home")} className="h-11 flex-row items-center gap-2 self-center rounded-full px-4">
      <Icon icon={SlidersHorizontal} size={16} tone="foreground-secondary" strokeWidth={1.75} />
      <Text className="text-meta font-medium text-foreground-secondary">{t("customize.open")}</Text>
    </Press>
  );
}

export function CustomizeHomePage() {
  const { t } = useTranslation("home");
  const [layout, setLayout] = useState<HomeLayout | null>(null);
  const [draft, setDraft] = useState<HomeLayout>(HOME_DEFAULT);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [done, setDone] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let live = true;
    void homeLayout().then((l) => {
      if (!live) return;
      setLayout(l);
      setDraft(l);
    });
    return () => {
      live = false;
    };
  }, []);

  const label = (k: HomeSectionKey) => t(`customize.section.${k}.label`);
  const toggle = (k: HomeSectionKey, on: boolean) => {
    setDraft((d) => showSection(d, k, on));
    setStatus(t(on ? "customize.shown" : "customize.hidden", { label: label(k) }));
  };
  const move = (k: HomeSectionKey, by: -1 | 1) => {
    const next = moveSection(draft, k, by);
    if (next === draft) return;
    haptic.select();
    setDraft(next);
    const area = next.order.filter((o) => areaOf(o) === areaOf(k));
    setStatus(t("customize.moved", { label: label(k), position: area.indexOf(k) + 1, total: area.length }));
  };
  const save = async () => {
    setSaving(true);
    setFailed(false);
    const r = await saveHomeLayout(draft).catch(() => ({ ok: false as const, error: "storage" }));
    setSaving(false);
    if (!r.ok) {
      haptic.error();
      return setFailed(true);
    }
    dataChanged();
    setDone(true);
  };

  const allHidden = draft.hidden.length === draft.order.length;
  return (
    <TaskPage
      title={t("customize.title")}
      done={done ? { title: t("customize.savedTitle"), body: t("customize.savedBody"), onDone: goBack } : null}
      footer={
        <>
          {failed && <Text accessibilityRole="alert" className="text-center text-body text-destructive">{t("customize.saveFailed")}</Text>}
          <Button onPress={save} disabled={!layout || saving || sameLayout(draft, layout)}>
            {saving ? t("customize.saving") : t("actions.save", { ns: "common" })}
          </Button>
          <Button variant="outline-pill" onPress={() => setDraft(HOME_DEFAULT)} disabled={!layout || sameLayout(draft, HOME_DEFAULT)}>
            {t("customize.reset")}
          </Button>
        </>
      }
    >
      <Text className="mt-2 text-body text-foreground-secondary">{t("customize.intro")}</Text>
      {HOME_AREAS.map((a) => {
        const keys = draft.order.filter((k) => areaOf(k) === a);
        return (
          <View key={a} className="mt-7">
            <TaskSection>{t(`customize.area.${a}`)}</TaskSection>
            <View accessibilityRole="list" className="mt-3 gap-2">
              {keys.map((k, i) => {
                const on = !draft.hidden.includes(k);
                return (
                  <View key={k} className={ROW}>
                    <View className={cn("min-w-0 flex-1", !on && "opacity-55")}>
                      <Text className={cn(TYPE.rowTitle, "font-medium")}>{label(k)}</Text>
                      <Text className={TYPE.rowSub}>{t(`customize.section.${k}.hint`)}</Text>
                    </View>
                    <Switch label={t("customize.show", { label: label(k) })} value={on} onValueChange={(v) => toggle(k, v)} />
                    <View className="ml-1 flex-row">
                      <MoveButton icon="up" label={t("customize.moveUp", { label: label(k) })} disabled={i === 0} onPress={() => move(k, -1)} />
                      <MoveButton icon="down" label={t("customize.moveDown", { label: label(k) })} disabled={i === keys.length - 1} onPress={() => move(k, 1)} />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}
      {allHidden && <Text className="mt-6 text-meta text-muted-foreground">{t("customize.onlyScores")}</Text>}
      <Text accessibilityLiveRegion="polite" className="absolute h-px w-px opacity-0">{status}</Text>
    </TaskPage>
  );
}

function MoveButton({ icon, label, disabled, onPress }: { icon: "up" | "down"; label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Press
      activeBg="bg-fill-faint"
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={cn("size-11 items-center justify-center rounded-full", disabled && "opacity-30")}
    >
      <Icon icon={icon === "up" ? ChevronUp : ChevronDown} size={20} tone="foreground-secondary" strokeWidth={1.75} />
    </Press>
  );
}
