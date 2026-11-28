// Log a past activity `/workout/log?d=2026-10-05&type=strength`: the sport, when it started, how long it took and an
// optional title, saved to Health Connect (so Google Health shows it too) and imported back like any workout. Its Strain
// and zones come from the band's heart rate in that window. The check is manualWorkout.ts; the save is the recorder's.
import { useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useTranslation } from "react-i18next";
import { checkDraft, draftFor, LOG_TYPES, overlapping, type LogDraft, type LogType, type ManualWorkout } from "@/live/manualWorkout";
import { workoutRecorder } from "@/live/workoutRecorder";
import { clock } from "@/lib/format";
import { activityHref, parseDay } from "@/lib/url";
import { activityKind, ACTIVITY_NAME, type ExerciseRow } from "@/queries/common";
import { DateTimeField } from "@/screens/log/DateTimeField";
import { Chips, Field, FormAlert, Input } from "@/screens/log/fields";
import { wallNow } from "@/screens/log/form";
import { ConfirmDialog } from "@/screens/settings/controls";
import { useScreen } from "@/screens/useScreen";
import { appStore, dataChanged, useApp } from "@/state/app";
import { Button } from "@/ui/Button";
import { haptic } from "@/ui/haptics";
import { CAPTION } from "@/ui/metrics/primitives";
import { goBack } from "@/ui/navigate";
import { TaskPage, TaskSection } from "@/ui/shells/TaskPage";
import { Text } from "@/ui/Text";
import { toast } from "@/ui/Toast";

const isLogType = (v: string | undefined): v is LogType => (LOG_TYPES as readonly string[]).includes(v ?? "");

export function LogActivityScreen() {
  const { t } = useTranslation("workouts");
  const { d, type } = useLocalSearchParams<{ d?: string; type?: string }>();
  const demo = useApp((s) => s.source) === "demo";
  const { data: vm } = useScreen(
    async (ctx) => ({ today: ctx.today, timeZone: ctx.timeZone, now: ctx.now, day: parseDay(d, ctx.today).d, exercises: await ctx.store.allExercises() }),
    ["workoutLog", d],
  );
  const [draft, setDraft] = useState<LogDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<{ workout: ManualWorkout; other: ExerciseRow } | null>(null);

  if (!vm)
    return (
      <TaskPage title={t("log.title")}>
        <View className="h-40" />
      </TaskPage>
    );

  const form = draft ?? draftFor(vm.day, vm.today, vm.timeZone, vm.now, isLogType(type) ? type : "");
  const set = <K extends keyof LogDraft>(k: K) => (v: LogDraft[K]) => {
    setDraft({ ...form, [k]: v });
    setError(null);
  };
  const types = LOG_TYPES.map((v) => [v, t(`log.types.${v}`)] as const);

  const save = async (workout: ManualWorkout) => {
    setConfirm(null);
    setSaving(true);
    setError(null);
    const hcId = await workoutRecorder.logManual(workout, vm.timeZone);
    setSaving(false);
    if (!hcId) {
      haptic.error();
      const code = workoutRecorder.getSnapshot().error;
      setError(t(code === "healthPermission" || code === "healthUnavailable" ? `log.errors.${code}` : "log.errors.failed"));
      return;
    }
    dataChanged();
    toast.success(t("log.saved"));
    // The activity page once the import has it (it does unless the read-back failed); else back where the form opened.
    const imported = await appStore().allExercises().then((all) => all.some((e) => e.id === hcId)).catch(() => false);
    if (imported) router.replace(activityHref(hcId) as Href);
    else goBack();
  };

  const submit = () => {
    const r = checkDraft(form, vm.timeZone, Math.floor(Date.now() / 1000));
    if (!r.ok) {
      haptic.error();
      return setError(t(`log.problems.${r.problem}`));
    }
    // Health Connect merges only same-sport copies that start and end within a minute, so ask before a second one.
    const [other] = overlapping(r.workout, vm.exercises);
    if (other) return setConfirm({ workout: r.workout, other });
    void save(r.workout);
  };

  const otherName = (e: ExerciseRow) => e.name?.trim() || ACTIVITY_NAME[activityKind(e.type)];

  return (
    <TaskPage
      title={t("log.title")}
      description={t("log.description")}
      footer={
        <>
          {demo && <FormAlert>{t("log.demo")}</FormAlert>}
          {!!error && <FormAlert>{error}</FormAlert>}
          <Button onPress={submit} disabled={saving || demo}>
            {saving ? t("log.saving") : t("actions.save", { ns: "common" })}
          </Button>
        </>
      }
    >
      <View className="gap-6 pt-2">
        <Section title={t("log.activity")}>
          <Chips label={t("log.activity")} options={types} value={form.type} onChange={(v) => set("type")(v as LogType | "")} />
        </Section>
        <Section title={t("log.when")}>
          <Field label={t("log.start")}>
            <DateTimeField label={t("log.start")} mode="datetime" value={form.start} max={wallNow(vm.timeZone)} onChange={set("start")} />
          </Field>
          <Field label={t("log.duration")} hint={t("log.minutesHint")}>
            <Input accessibilityLabel={t("log.duration")} inputMode="numeric" maxLength={4} value={form.minutes} onChangeText={set("minutes")} className="text-body tabular-nums" returnKeyType="done" />
          </Field>
        </Section>
        <Section title={t("log.details")}>
          <Field label={t("log.name")} hint={t("log.optional")}>
            <Input accessibilityLabel={t("log.name")} inputMode="text" maxLength={60} placeholder={form.type ? t(`log.types.${form.type}`) : undefined} value={form.title} onChangeText={set("title")} className="text-body" returnKeyType="done" />
          </Field>
          <Text className={CAPTION}>{t("log.strainNote")}</Text>
        </Section>
      </View>
      <ConfirmDialog
        open={!!confirm}
        title={t("log.overlapTitle")}
        description={confirm ? t("log.overlapBody", { name: otherName(confirm.other), start: clock(confirm.other.startTs * 1000, vm.timeZone), end: clock(confirm.other.endTs * 1000, vm.timeZone) }) : ""}
        confirmLabel={t("log.saveAnyway")}
        pendingLabel={t("log.saving")}
        pending={saving}
        confirmVariant="primary"
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && void save(confirm.workout)}
      />
    </TaskPage>
  );
}

/** A caps heading over its controls, as the Log's sheets. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-3">
      <TaskSection>{title}</TaskSection>
      {children}
    </View>
  );
}
