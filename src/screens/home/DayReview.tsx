// Home's day banner and the review page it opens (pulse src/components/metrics/DayReview.tsx and
// src/app/(app)/_lib/DayReviewSheet.tsx, spec §7.1 7a). The banner is a card: the title, one line built from the
// numbers and the Sleep, Recovery and Strain values. The page reads the day at a glance: the three scores against the
// week before, the Strain track with its target, what moved Recovery, the stress split, the Energy Bank and the night.
// A block the day did not measure is left out. The morning leads with last night; the evening ends with it.
import type { ReactNode } from "react";
import { View } from "react-native";
import { Trans, useTranslation } from "react-i18next";
import { i18n } from "@/i18n/config";
import { ChevronRight, Moon, Sun } from "lucide-react-native";
import { DATA_COLORS, dialColor } from "@/lib/bands";
import { clock, DAY, formatDay, formatValue, hmm } from "@/lib/format";
import { dayHref } from "@/lib/url";
import { getDayReview, type DayReviewVM, type ReviewScore, type ReviewScoreKey, weekDelta } from "@/queries/dayReview";
import { CardEdge, SECONDARY_ROW, useCardStyle } from "@/ui/Card";
import { cn } from "@/ui/cn";
import { Gradient } from "@/ui/Gradient";
import { Icon } from "@/ui/Icon";
import { BreakdownBar } from "@/ui/metrics/BreakdownBar";
import { CAPTION, DeltaMark, LABEL, ValueUnit } from "@/ui/metrics/primitives";
import { push } from "@/ui/navigate";
import { Press } from "@/ui/Press";
import { useSelectedDay } from "@/ui/shells/DateSwitcher";
import { useShellCalendar } from "@/ui/shells/ShellStatus";
import { TaskPage } from "@/ui/shells/TaskPage";
import { SkeletonText } from "@/ui/Skeleton";
import { Text } from "@/ui/Text";
import { useTheme } from "@/ui/theme";
import { TYPE } from "@/ui/type";
import { ScreenError } from "../ScreenError";
import { useScreen } from "../useScreen";

const FORMAT = { sleep: "int", recovery: "int", strain: "int" } as const;
/** Strain is a percent here (AGENTS.md "Scales"): every score reads as one, and the track runs 0 to 100. */
const UNIT = "%";
const SCORE_HREF: Record<ReviewScoreKey, string> = { sleep: "/sleep", recovery: "/recovery", strain: "/strain" };
/** A time or number inside a sentence (<t>…</t> in the keys). */
const NUM = <Text className="font-numeric tabular-nums" />;

const scoreName = (k: ReviewScoreKey) => i18n.t(`home:review.score.${k}`);
const colorOf = (s: Pick<ReviewScore, "key" | "value">) => (s.value === null ? null : DATA_COLORS[dialColor(s.key, s.value)]);

/** The banner's three readouts: label over a coloured number, no rings (the dials sit right above). */
function ScoresInline({ scores }: { scores: ReviewScore[] }) {
  return (
    <View className="flex-row flex-wrap items-baseline gap-x-4 gap-y-1">
      {scores.map((s) => {
        const color = colorOf(s);
        return (
          <View key={s.key} className="flex-row items-baseline gap-1.5">
            <Text className="text-caption font-medium text-muted-foreground">{scoreName(s.key)}</Text>
            <Text className={cn("font-numeric text-body font-bold tabular-nums", color ? color.text : "text-muted-foreground")}>
              {formatValue(FORMAT[s.key], s.value)}
              {s.value !== null && UNIT}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** Home's day banner: opens the review page for the day. */
export function DayReviewBanner({ review, today }: { review: DayReviewVM; today: string }) {
  const { t } = useTranslation("home");
  const { c, scheme } = useTheme();
  const shadow = useCardStyle();
  const evening = review.kind === "review";
  const spoken = [review.title, review.headline, ...review.scores.map((s) => `${scoreName(s.key)} ${s.value === null ? t("review.noData") : `${formatValue(FORMAT[s.key], s.value)}${UNIT}`}`)].join(", ");
  return (
    <Press
      activeScale={0.98}
      accessibilityRole="button"
      accessibilityLabel={spoken}
      accessibilityHint={t("review.openHint")}
      onPress={() => push(dayHref("/day-review", review.day, today))}
      className="w-full flex-row items-start gap-3 overflow-hidden rounded-2xl px-4 py-4"
      style={shadow}
    >
      <Gradient from={evening ? c["banner-from"] : c["outlook-from"]} to={evening ? c["banner-to"] : c["outlook-to"]} />
      {scheme === "dark" && <CardEdge />}
      <View className="pt-0.5">
        <Icon icon={evening ? Moon : Sun} size={20} tone="foreground-secondary" strokeWidth={1.5} />
      </View>
      <View className="min-w-0 flex-1 gap-1">
        <Text className="text-caption font-medium text-foreground-secondary">{review.title}</Text>
        <Text className="text-body font-semibold">{review.headline}</Text>
        <View className="mt-1">
          <ScoresInline scores={review.scores} />
        </View>
      </View>
      <View className="pt-0.5">
        <Icon icon={ChevronRight} size={20} tone={evening ? "coach-text" : "outlook-accent"} strokeWidth={1.75} />
      </View>
    </Press>
  );
}

function ScoreTile({ s, href }: { s: ReviewScore; href: string }) {
  const { t } = useTranslation("home");
  const color = colorOf(s);
  const delta = weekDelta(s);
  const pct = s.value === null ? 0 : Math.min(100, Math.max(0, s.value));
  // Strain is neither good nor bad on its own; Sleep and Recovery are better higher.
  const tone = !delta || delta.dir === "flat" || s.key === "strain" ? "neutral" : delta.dir === "up" ? "good" : "bad";
  const amount = delta ? formatValue("int", Math.abs(delta.diff)) : "";
  const note = !delta ? t("review.noAverage") : delta.dir === "flat" ? t("review.nearAverage") : t(delta.dir === "up" ? "review.aboveAverage" : "review.belowAverage", { amount });
  return (
    <Press
      activeBg="bg-accent"
      accessibilityRole="link"
      accessibilityLabel={`${scoreName(s.key)} ${s.value === null ? t("review.noData") : `${formatValue(FORMAT[s.key], s.value)}${UNIT}`}, ${note}`}
      onPress={() => push(href)}
      className={cn(SECONDARY_ROW, "min-w-0 flex-1 gap-2 rounded-xl p-3")}
    >
      <Text numberOfLines={1} className={cn(LABEL, "text-foreground-secondary")}>{scoreName(s.key)}</Text>
      <ValueUnit fit value={formatValue(FORMAT[s.key], s.value)} unit={UNIT} className={cn("font-numeric text-title font-bold", color ? color.text : "text-muted-foreground")} />
      <View accessibilityElementsHidden className="h-1 overflow-hidden rounded-full bg-dial-track">
        {color && <View className={cn("h-full rounded-full", color.bg)} style={{ width: `${pct}%` }} />}
      </View>
      <View className="min-h-4 flex-row items-start gap-1">
        {delta && (
          <View className="h-4 justify-center">
            <DeltaMark dir={delta.dir} tone={tone} />
          </View>
        )}
        <Text className={cn(CAPTION, "min-w-0 shrink text-caption tabular-nums")}>{note}</Text>
      </View>
    </Press>
  );
}

/** The day's Strain on a 0 to 100 track, the target band behind it and a marker at the value. */
function StrainTrack({ value, target }: NonNullable<DayReviewVM["strain"]>) {
  const { t } = useTranslation("home");
  const { c } = useTheme();
  const top = Math.max(100, value);
  const at = (v: number) => `${(Math.min(top, Math.max(0, v)) / top) * 100}%` as const;
  const verdict = !target ? null : value > target[1] ? "above" : value >= target[0] ? "in" : "below";
  return (
    <View className="gap-2">
      <View className="flex-row flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <Text className="text-body text-foreground-secondary">
          <Text className="font-numeric font-bold tabular-nums text-strain-text">{formatValue("int", value)}%</Text>
          {target && (
            <>
              {" "}
              <Trans t={t} i18nKey="review.ofTarget" values={{ low: formatValue("int", target[0]), high: formatValue("int", target[1]) }} components={{ t: NUM }} />
            </>
          )}
        </Text>
        {verdict && <Text className={cn(CAPTION, verdict === "in" && "text-optimal-text")}>{t(`review.target.${verdict}`)}</Text>}
      </View>
      <View accessibilityElementsHidden className="h-2 justify-center rounded-full bg-dial-track">
        {target && <View className="absolute inset-y-0 rounded-full bg-optimal/45" style={{ left: at(target[0]), width: `${((Math.min(top, target[1]) - Math.min(top, target[0])) / top) * 100}%` }} />}
        <View className="absolute size-3.5 rounded-full bg-strain" style={{ left: at(value), marginLeft: -7, borderWidth: 2, borderColor: c.background }} />
      </View>
      <View accessibilityElementsHidden className="flex-row justify-between">
        <Text className={cn(CAPTION, "font-numeric tabular-nums")}>0</Text>
        <Text className={cn(CAPTION, "font-numeric tabular-nums")}>{top === 100 ? "100%" : `${Math.round(top)}%`}</Text>
      </View>
    </View>
  );
}

function SleepBlock({ sleep, timeZone }: { sleep: NonNullable<DayReviewVM["sleep"]>; timeZone: string }) {
  const { t } = useTranslation("home");
  const pct = Math.min(100, (sleep.asleepMin / sleep.needMin) * 100);
  const short = sleep.needMin - sleep.asleepMin;
  return (
    <View className="gap-4">
      <View className="gap-2">
        <View className="flex-row flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <Text className="text-body text-foreground-secondary">
            <Trans t={t} i18nKey="review.sleepOf" values={{ asleep: hmm(sleep.asleepMin), need: hmm(sleep.needMin) }} components={{ b: <Text className="font-numeric font-bold tabular-nums text-sleep" />, t: NUM }} />
          </Text>
          <Text className={cn(CAPTION, "font-numeric tabular-nums")}>{t("review.bedWake", { bed: clock(sleep.start, timeZone), wake: clock(sleep.end, timeZone) })}</Text>
        </View>
        <View accessibilityElementsHidden className="h-2 overflow-hidden rounded-full bg-dial-track">
          <View className="h-full rounded-full bg-sleep" style={{ width: `${pct}%` }} />
        </View>
        <Text className={CAPTION}>
          {short > 15 ? <Trans t={t} i18nKey="review.short" values={{ short: hmm(short) }} components={{ t: NUM }} /> : t("review.metNeed")}
          {sleep.debtMin >= 30 && (
            <>
              {" "}
              <Trans t={t} i18nKey="review.debt" values={{ debt: hmm(sleep.debtMin) }} components={{ t: NUM }} />
            </>
          )}
        </Text>
      </View>
      {sleep.stages && (
        <BreakdownBar
          title={t("review.stages")}
          unit="duration"
          items={[
            { key: "deep", label: t("hypnogram.deep", { ns: "ui" }), value: sleep.stages.deep },
            { key: "rem", label: t("hypnogram.rem", { ns: "ui" }), value: sleep.stages.rem },
            { key: "light_sleep", label: t("hypnogram.light", { ns: "ui" }), value: sleep.stages.light },
            { key: "awake", label: t("hypnogram.awake", { ns: "ui" }), value: sleep.stages.awake },
          ]}
        />
      )}
    </View>
  );
}

function Section({ title, href, linkLabel, children }: { title: string; href?: string; linkLabel?: string; children: ReactNode }) {
  return (
    <View className="gap-3">
      <View className="min-h-8 flex-row items-center gap-3">
        <Text accessibilityRole="header" className={TYPE.group}>{title}</Text>
        <View className="h-px flex-1 bg-foreground/10" />
        {!!href && (
          <Press activeOpacity={0.7} accessibilityRole="link" accessibilityLabel={linkLabel} onPress={() => push(href)} hitSlop={8} className="-mr-1 size-8 items-center justify-center rounded-md">
            <Icon icon={ChevronRight} size={16} tone="muted-foreground" strokeWidth={1.75} />
          </Press>
        )}
      </View>
      {children}
    </View>
  );
}

function EnergyStat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <View className={cn(SECONDARY_ROW, "min-w-0 flex-1 px-3 py-2")}>
      <Text numberOfLines={1} className={cn(LABEL, "text-muted-foreground")}>{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit className={cn("mt-1 font-numeric text-value font-bold leading-6 tabular-nums", className)}>{value}</Text>
    </View>
  );
}

/** The page body for one day's review. */
export function DayReviewBody({ vm, today, timeZone }: { vm: DayReviewVM; today: string; timeZone: string }) {
  const { t } = useTranslation("home");
  const at = (href: string) => dayHref(href, vm.day, today);
  const evening = vm.kind === "review";
  const sleep = vm.sleep && <SleepBlock sleep={vm.sleep} timeZone={timeZone} />;
  const open = (name: string) => t("review.open", { name });
  return (
    <View className="gap-7 pt-4">
      <Text className="text-heading font-semibold">{vm.headline}</Text>
      <View accessibilityRole="list" className="flex-row gap-2">
        {vm.scores.map((s) => <ScoreTile key={s.key} s={s} href={at(SCORE_HREF[s.key])} />)}
      </View>
      {/* Morning: what last night gave you, then the target. Evening: what you did, then how you slept into it. */}
      {!evening && sleep && (
        <Section title={t("review.lastNight")} href={at("/sleep")} linkLabel={open(t("review.score.sleep"))}>
          {sleep}
        </Section>
      )}
      {vm.strain && (
        <Section title={t(vm.live ? "review.strainSoFar" : "review.strain")} href={at("/strain")} linkLabel={open(t("review.score.strain"))}>
          <StrainTrack {...vm.strain} />
        </Section>
      )}
      {vm.drivers.length > 0 && (
        <Section title={t("review.drivers")} href={at("/recovery")} linkLabel={open(t("review.score.recovery"))}>
          <View accessibilityRole="list" className="flex-row flex-wrap gap-2">
            {vm.drivers.map((d) => (
              <View
                key={d.key}
                accessible
                accessibilityLabel={t("review.driverSpoken", { label: d.label, points: formatValue("signedInt", d.points) })}
                className={cn(SECONDARY_ROW, "max-w-full min-h-8 flex-row items-center gap-1.5 px-3 py-1.5")}
              >
                <DeltaMark dir={d.points > 0 ? "up" : "down"} tone={d.points > 0 ? "good" : "bad"} />
                <Text className="shrink text-meta font-medium">{d.label}</Text>
                <Text className="font-numeric text-meta font-medium tabular-nums text-foreground-secondary">{formatValue("signedInt", d.points)}</Text>
              </View>
            ))}
          </View>
        </Section>
      )}
      {vm.stress && (
        <Section title={t("review.stress")} href={at("/health/stress")} linkLabel={open(t("stress.title"))}>
          <BreakdownBar
            title={t("review.stressLevels")}
            unit="duration"
            items={[
              { key: "low", label: t("stressLevel.low", { ns: "common" }), value: vm.stress.lowMin },
              { key: "medium", label: t("stressLevel.medium", { ns: "common" }), value: vm.stress.mediumMin },
              { key: "high", label: t("stressLevel.high", { ns: "common" }), value: vm.stress.highMin },
            ]}
          />
        </Section>
      )}
      {vm.energy && (
        <Section title={t("section.energyBank")}>
          <View className="flex-row gap-2">
            <EnergyStat label={t("review.started")} value={`${formatValue("int", vm.energy.start)}%`} />
            <EnergyStat label={t("energy.charged")} value={formatValue("signedInt", vm.energy.charged)} className="text-optimal-text" />
            <EnergyStat label={t("energy.drained")} value={formatValue("signedInt", -Math.abs(vm.energy.drained))} className="text-warning-text" />
          </View>
          <Text className={CAPTION}>
            <Trans t={t} i18nKey={vm.live ? "review.nowAt" : "review.endedAt"} values={{ level: formatValue("int", vm.energy.now) }} components={{ t: <Text className="font-numeric tabular-nums text-foreground" /> }} />
          </Text>
        </Section>
      )}
      {evening && sleep && (
        <Section title={t(vm.live ? "review.lastNight" : "review.nightBefore")} href={at("/sleep")} linkLabel={open(t("review.score.sleep"))}>
          {sleep}
        </Section>
      )}
    </View>
  );
}

/** The review page (app/day-review.tsx): the day from `?d=`. */
export function DayReviewPage() {
  const { t } = useTranslation("home");
  const [d] = useSelectedDay();
  const { today, timeZone } = useShellCalendar();
  const { data, error, reload } = useScreen((ctx) => getDayReview(d, ctx), ["day-review", d]);
  const vm = data !== undefined && (data === null || data.day === d) ? data : undefined;
  if (vm === undefined && error) return <ScreenError error={error} retry={async () => reload()} />;
  return (
    <TaskPage title={vm?.title ?? t("outlook.titleReview")} description={formatDay(d, DAY.short)}>
      {vm === undefined || !timeZone ? (
        <View className="gap-4 pt-4">
          <SkeletonText lh={26} fs={20} className="w-3/4" />
          <SkeletonText lh={96} fs={96} className="w-full" />
        </View>
      ) : vm === null ? (
        <Text className="pt-6 text-body text-foreground-secondary">{t("review.nothing")}</Text>
      ) : (
        <DayReviewBody vm={vm} today={today} timeZone={timeZone} />
      )}
    </TaskPage>
  );
}
