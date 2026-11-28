// Metric search (pulse src/components/shells/CommandMenu.tsx; Linear's search: a field, category tabs under it, results
// grouped by kind). Every My Dashboard metric with its value on the day on screen and how it sits against its 30-day
// average, so a search answers without opening anything. With no query, "Recent" lists the metrics opened last and
// "Off your usual" the ones furthest from normal that day. A result opens the metric on that day. Opened from the
// magnifier in Home's header (app/search.tsx, `?d=` the day on screen).
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ScrollView, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Activity, CalendarDays, CircleX, FileText, LayoutGrid, Moon, NotebookPen, Search, Settings, SlidersHorizontal, Sparkles, Stethoscope, Waves, Zap, type LucideIcon, BarChart3, Dumbbell, Gauge, HeartPulse, Heart, SunMoon } from "lucide-react-native";
import { i18n } from "@/i18n/config";
import { pushRecentMetric, recentMetrics } from "@/actions/recentMetrics";
import { deltaTone } from "@/lib/bands";
import { DASHBOARD_GROUPS, type DashboardGroup } from "@/lib/dashboard";
import { formatValue } from "@/lib/format";
import { groupLabel } from "@/lib/metricLabels";
import { matchesAll, offUsual, rankMetrics, SEARCH_ACTIONS, SEARCH_PAGES, type SearchCommand } from "@/lib/search";
import { dayHref, trendHref } from "@/lib/url";
import { getSearchIndex, SEARCHABLE, type SearchMetric } from "@/queries/search";
import { cn } from "@/ui/cn";
import { FACES } from "@/ui/fontClasses";
import { Icon } from "@/ui/Icon";
import { DeltaMark, ValueUnit } from "@/ui/metrics/primitives";
import { push } from "@/ui/navigate";
import { Press } from "@/ui/Press";
import { useSelectedDay } from "@/ui/shells/DateSwitcher";
import { useShellCalendar } from "@/ui/shells/ShellStatus";
import { TaskPage, TaskSection } from "@/ui/shells/TaskPage";
import { SkeletonText } from "@/ui/Skeleton";
import { Text } from "@/ui/Text";
import { useTheme } from "@/ui/theme";
import { TYPE } from "@/ui/type";
import { statIcon, statProps } from "../_lib/view";
import { useScreen } from "../useScreen";

type Tab = "all" | DashboardGroup | "commands";
const ICON: Record<SearchCommand["id"], LucideIcon> = {
  home: LayoutGrid,
  recovery: Gauge,
  sleep: Moon,
  strain: Zap,
  health: HeartPulse,
  pulseAge: Sparkles,
  monitor: Stethoscope,
  stress: Waves,
  fitness: Dumbbell,
  heartRate: Heart,
  journal: NotebookPen,
  insights: Activity,
  trends: BarChart3,
  reports: FileText,
  activities: CalendarDays,
  coach: Sparkles,
  settings: Settings,
  checkIn: NotebookPen,
  review: SunMoon,
  customize: SlidersHorizontal,
};
const ROW = "min-h-14 flex-row items-center gap-3 rounded-lg px-3 py-2";

type Entry = { id: string; label: string; sub?: string; icon: ReactNode; value?: ReactNode; spoken: string; open: () => void };
type Group = { title: string; entries: Entry[] };

function MetricValue({ m }: { m: SearchMetric | undefined }) {
  const { t } = useTranslation("home");
  if (!m) return <SkeletonText lh={16} fs={12} className="w-12" />;
  const p = statProps(m, undefined, false);
  const v = m.metric.value;
  if (v === null) return <Text className="text-caption text-muted-foreground">{t("search.noData")}</Text>;
  const tone = m.average !== null && p.direction !== "none" ? deltaTone(p.direction, v, m.average, m.sd) : null;
  return (
    <View className="flex-row items-center gap-1.5">
      {tone && <DeltaMark dir={tone.dir} tone={tone.tone} />}
      <ValueUnit value={formatValue(p.format, v)} unit={p.unit} className="font-numeric text-meta font-semibold text-foreground" />
    </View>
  );
}

const spokenValue = (m: SearchMetric | undefined, label: string) => {
  const v = m?.metric.value;
  if (!m || v === null || v === undefined) return i18n.t("home:search.noDataSpoken", { label });
  const p = statProps(m, undefined, false);
  return i18n.t("home:search.valueSpoken", { label, value: `${formatValue(p.format, v)}${p.unit ? ` ${p.unit}` : ""}` });
};

export function SearchPage() {
  const { t } = useTranslation("home");
  const { c } = useTheme();
  const [d] = useSelectedDay();
  const { today } = useShellCalendar();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [recent, setRecent] = useState<string[]>([]);
  const { data } = useScreen((ctx) => getSearchIndex(d, ctx), ["search", d]);
  // Values only for the day on screen: another day's index waits behind the loading bars until its own arrives.
  const shown = data && data.day === d ? data : null;
  const byKey = useMemo(() => new Map(shown?.metrics.map((m) => [m.key as string, m])), [shown]);

  useEffect(() => {
    void recentMetrics().then(setRecent);
  }, []);

  const groups: Group[] = useMemo(() => {
    const metricEntry = (key: string, section: string): Entry | null => {
      const c = SEARCHABLE.find((m) => m.key === key);
      if (!c) return null;
      const m = byKey.get(key);
      const label = c.label;
      // The day on screen opens the metric on that day, the day its value belongs to.
      const href = dayHref(m?.href ?? trendHref(key), d, today);
      return {
        id: `${section}-${key}`,
        label,
        sub: groupLabel(c.group),
        icon: statIcon(key),
        value: <MetricValue m={m} />,
        spoken: spokenValue(m, label),
        open: () => {
          void pushRecentMetric(key);
          push(href);
        },
      };
    };
    const commandEntry = (cmd: SearchCommand): Entry => {
      const label = t(`search.page.${cmd.id}`);
      return {
        id: cmd.id,
        label,
        icon: <Icon icon={ICON[cmd.id]} size={20} tone="muted-foreground" />,
        spoken: label,
        open: () => push(cmd.day ? dayHref(cmd.href, d, today) : cmd.href),
      };
    };
    const q = query.trim();
    const metricTab = tab !== "all" && tab !== "commands";
    const out: Group[] = [];
    const add = (title: string, entries: (Entry | null)[]) => {
      const list = entries.filter((e): e is Entry => !!e);
      if (list.length) out.push({ title, entries: list });
    };
    if (tab !== "commands") {
      const pool = SEARCHABLE.filter((m) => !metricTab || m.group === tab);
      if (q) add(t("search.metrics"), rankMetrics(pool, q, groupLabel).map((m) => metricEntry(m.key, "q")));
      else if (metricTab) add(groupLabel(tab), pool.map((m) => metricEntry(m.key, "tab")));
      else {
        add(t("search.recent"), recent.map((k) => metricEntry(k, "recent")));
        add(d === today ? t("search.offUsual") : t("search.offUsualDay"), offUsual(shown?.metrics ?? [], recent).map((m) => metricEntry(m.key, "off")));
      }
    }
    if (tab === "all" || tab === "commands") {
      const hit = (cmd: SearchCommand) => !q || matchesAll(`${t(`search.page.${cmd.id}`)} ${cmd.words}`, q);
      add(t("search.pages"), SEARCH_PAGES.filter(hit).map(commandEntry));
      add(t("search.actions"), SEARCH_ACTIONS.filter(hit).map(commandEntry));
    }
    return out;
  }, [query, tab, recent, byKey, shown, d, today, t]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "all", label: t("search.tabs.all") },
    ...DASHBOARD_GROUPS.map((g) => ({ key: g.key as Tab, label: g.label })),
    { key: "commands", label: t("search.tabs.commands") },
  ];
  const empty = groups.length === 0;
  return (
    <TaskPage title={t("search.title")}>
      <View className="relative mt-3">
        <View pointerEvents="none" className="absolute left-3 top-0 z-10 h-12 justify-center">
          <Icon icon={Search} size={18} tone="muted-foreground" strokeWidth={1.75} />
        </View>
        <TextInput
          autoFocus
          value={query}
          onChangeText={setQuery}
          placeholder={t("search.placeholder")}
          placeholderTextColor={c["muted-foreground"]}
          accessibilityLabel={t("search.label")}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          returnKeyType="search"
          className="h-12 rounded-xl bg-fill-faint pl-10 pr-12 text-body text-foreground"
          style={{ fontFamily: FACES.sans.regular }}
        />
        {!!query && (
          <Press accessibilityRole="button" accessibilityLabel={t("search.clear")} onPress={() => setQuery("")} hitSlop={4} className="absolute right-1 top-1 size-10 items-center justify-center rounded-full">
            <Icon icon={CircleX} size={18} tone="muted-foreground" strokeWidth={1.75} />
          </Press>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" className="-mx-4 mt-3" contentContainerClassName="gap-1.5 px-4">
        <View accessibilityRole="tablist" className="flex-row gap-1.5">
          {tabs.map((x) => {
            const on = x.key === tab;
            return (
              <Press
                key={x.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                onPress={() => setTab(x.key)}
                className={cn("h-9 items-center justify-center rounded-full px-3", on ? "bg-foreground" : "bg-fill-faint")}
              >
                <Text className={cn(TYPE.tab, "whitespace-nowrap", on ? "text-background" : "text-foreground-secondary")}>{x.label}</Text>
              </Press>
            );
          })}
        </View>
      </ScrollView>
      {groups.map((g) => (
        <View key={g.title} className="mt-6">
          <TaskSection>{g.title}</TaskSection>
          <View accessibilityRole="list" className="-mx-3 mt-2">
            {g.entries.map((e) => (
              <Press key={e.id} activeBg="bg-fill-faint" accessibilityRole="link" accessibilityLabel={e.spoken} onPress={e.open} className={ROW}>
                <View accessibilityElementsHidden className="size-5 shrink-0 items-center justify-center">{e.icon}</View>
                <View className="min-w-0 flex-1">
                  <Text className={TYPE.rowTitle}>{e.label}</Text>
                  {!!e.sub && <Text className={TYPE.rowSub}>{e.sub}</Text>}
                </View>
                {!!e.value && <View accessibilityElementsHidden className="shrink-0">{e.value}</View>}
              </Press>
            ))}
          </View>
        </View>
      ))}
      {empty && <Text className="py-8 text-center text-body text-foreground-secondary">{query.trim() ? t("search.noMatch", { query: query.trim() }) : t("search.hint")}</Text>}
    </TaskPage>
  );
}
