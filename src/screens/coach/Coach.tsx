import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, Keyboard, Platform, ScrollView, Share, TextInput, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useChat } from "@ai-sdk/react";
import type { CoachActivity } from "@/coach/activity";
import type { UIMessage } from "ai";
import { Activity, ArrowDown, ArrowUp, ChevronRight, Copy, Dumbbell, Moon, Pencil, RefreshCw, RotateCcw, Share2, Square, type LucideIcon } from "lucide-react-native";
import type { CoachSuggestion as CoreSuggestion } from "@/core/algorithms/coachSuggestions";
import { plainText } from "@/coach/chats";
import { i18n } from "@/i18n/config";
import { deviceTransport } from "@/coach/session";
import { Mark } from "@/ui/brand";
import { cn } from "@/ui/cn";
import { Gradient } from "@/ui/Gradient";
import { Icon } from "@/ui/Icon";
import { useKeyboardInset } from "@/ui/keyboard";
import { Press } from "@/ui/Press";
import { Text } from "@/ui/Text";
import { useTheme } from "@/ui/theme";
import { Evidence } from "./Evidence";
import { Prose } from "./Prose";
import { haptic } from "@/ui/haptics";
import { MenuPanel, useMenu } from "@/ui/Menu";
import { toast } from "@/ui/Toast";

type Part = UIMessage["parts"][number];

type CoachSuggestion = { key: CoreSuggestion["key"]; text: string };
const SUGGESTION_ICONS: Record<CoachSuggestion["key"], LucideIcon> = { brief: Activity, recovery: Activity, training: Dumbbell, hrv: Activity, sleep: Moon, strain: Dumbbell, sync: RefreshCw };

/** The tools with a progress line (`coach:running.<tool>`); any other tool reads the default. */
const RUNNING = ["get_day", "get_sleep", "get_activity", "get_trend", "get_activities", "get_journal_impacts", "get_health", "get_report", "get_profile"];

const PROBLEMS = ["limit", "key", "profile", "provider", "server", "network"] as const;
/** The composer's least gap to the screen's bottom edge, and its gap above the keyboard. */
const COMPOSER_GAP = 12;

/** The sentence for a CoachProblem code (see transport.ts); anything else reads the default. */
const errorText = (e: Error) => {
  const code = PROBLEMS.find((p) => p === e.message.trim());
  return code ? i18n.t(`coach:errors.${code}`) : i18n.t("coach:errors.default");
};

/** Copies text and says so (a toast): an answer, or the person's own message. */
async function copy(text: string) {
  await Clipboard.setStringAsync(text);
  haptic.tap();
  // Android 13 and later show their own confirmation of what was copied; a toast of ours would say it twice.
  if (!(Platform.OS === "android" && Number(Platform.Version) >= 33)) toast.success(i18n.t("coach:chat.copied"));
}

/** How near the end (px) still counts as "at the latest message": the chat follows a streaming answer only there. */
const AT_END = 96;

/** One row of a message's long-press menu. */
function MenuRow({ label, icon, onPress, disabled }: { label: string; icon: LucideIcon; onPress: () => void; disabled?: boolean }) {
  return (
    <Press accessibilityRole="menuitem" disabled={disabled} onPress={onPress} activeBg="bg-fill-hover" className={cn("h-11 flex-row items-center gap-3 rounded-lg px-3", disabled && "opacity-40")}>
      <Icon icon={icon} size={18} tone="foreground-secondary" />
      <Text className="text-body text-popover-foreground">{label}</Text>
    </Press>
  );
}

export function CoachMark({ size }: { size: number }) {
  const { c } = useTheme();
  return (
    <View accessibilityElementsHidden className="overflow-hidden rounded-full p-px" style={{ width: size, height: size }}>
      <Gradient from={c["insight-from"]} to={c["insight-to"]} angle="xy" />
      <View className="flex-1 items-center justify-center rounded-full bg-background">
        <Mark size={Math.round(size * 0.42)} />
      </View>
    </View>
  );
}

/** A caption with a coach-blue dot: tool progress, "Thinking…", a tool that failed. */
function Caption({ live, children }: { live?: boolean; children: string }) {
  return (
    <View className="min-h-6 flex-row items-center gap-2" accessibilityLiveRegion={live ? "polite" : "none"}>
      <View className={cn("size-1.5 rounded-full bg-coach", live && "animate-pulse")} />
      <Text className="text-meta text-muted-foreground">{children}</Text>
    </View>
  );
}

function PartView({ part }: { part: Part }) {
  const { t } = useTranslation("coach");
  if (part.type === "text") return part.text.trim() ? <Prose text={part.text} /> : null;
  if (!part.type.startsWith("tool-")) return null;
  const name = part.type.slice(5);
  const tool = part as Part & { state: string; output?: unknown };
  if (tool.state === "output-error") return <Caption>{t("chat.toolFailed")}</Caption>;
  if (tool.state !== "output-available") return <Caption live>{RUNNING.includes(name) ? i18n.t(`coach:running.${name}` as "coach:running.get_day") : t("running.default")}</Caption>;
  return <Evidence name={name} output={tool.output} />;
}

function IconAction({ label, icon, onPress, disabled }: { label: string; icon: LucideIcon; onPress: () => void; disabled?: boolean }) {
  return (
    <Press accessibilityRole="button" accessibilityLabel={label} onPress={onPress} disabled={disabled} activeBg="bg-fill-hover" className={cn("size-11 items-center justify-center rounded-full", disabled && "opacity-30")}>
      <Icon icon={icon} size={17} strokeWidth={1.75} tone="muted-foreground" />
    </Press>
  );
}

function Pill({ label, onPress, disabled, primary, icon }: { label: string; onPress: () => void; disabled?: boolean; primary?: boolean; icon?: ReactNode }) {
  return (
    <Press accessibilityRole="button" onPress={onPress} disabled={disabled} className={cn("h-10 flex-row items-center gap-1.5 rounded-full px-4", primary ? "bg-primary" : "bg-secondary", disabled && "opacity-45")}>
      {icon}
      <Text className={cn("text-meta font-semibold", primary ? "text-primary-foreground" : "text-foreground")}>{label}</Text>
    </Press>
  );
}

function UserMessage({ m, busy, onEdit, onEditing }: { m: UIMessage; busy: boolean; onEdit: (text: string) => void; /** The edit field opened (its view) or closed (null). */ onEditing: (view: View | null) => void }) {
  const { t } = useTranslation("coach");
  const { c } = useTheme();
  const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
  const [draft, setDraft] = useState<string | null>(null);
  const { ref: menuRef, anchor, open: openMenu, close: closeMenu } = useMenu();
  if (draft !== null)
    return (
      <View className="ml-8 gap-2" ref={onEditing} collapsable={false}>
        <TextInput
          autoFocus
          multiline
          value={draft}
          onChangeText={setDraft}
          maxLength={2000}
          accessibilityLabel={t("chat.editLabel")}
          cursorColor={c.coach}
          className="max-h-60 min-h-11 rounded-2xl bg-secondary px-4 py-3 text-body text-foreground"
        />
        <View className="flex-row justify-end gap-2">
          <Pill label={t("actions.cancel", { ns: "common" })} onPress={() => (setDraft(null), onEditing(null))} />
          <Pill
            label={t("chat.saveAndSend")}
            primary
            disabled={busy || !draft.trim()}
            onPress={() => {
              const edited = draft.trim();
              setDraft(null);
              onEditing(null);
              if (edited !== text.trim()) onEdit(edited);
            }}
          />
        </View>
      </View>
    );
  // Copy and Edit sit behind a long press on the bubble, as in the chat apps people know (ChatGPT, Claude), not as a
  // link under every message; a screen reader gets both as actions.
  return (
    <View className="items-end pl-8">
      <View ref={menuRef} collapsable={false} className="max-w-full">
        <Press
          accessibilityHint={t("chat.holdHint")}
          accessibilityActions={[{ name: "copy", label: t("chat.copy") }, ...(busy ? [] : [{ name: "edit", label: t("chat.editMessage") }])]}
          onAccessibilityAction={(e) => (e.nativeEvent.actionName === "copy" ? void copy(text) : setDraft(text))}
          onLongPress={() => (haptic.select(), openMenu())}
          delayLongPress={350}
          activeScale={0.98}
          className="rounded-2xl bg-secondary px-4 py-3"
        >
          <Text className="text-body text-foreground">{text}</Text>
        </Press>
      </View>
      <MenuPanel anchor={anchor} onClose={closeMenu} align="end" className="min-w-48">
        <MenuRow label={t("chat.copy")} icon={Copy} onPress={() => (closeMenu(), void copy(text))} />
        <MenuRow label={t("chat.editMessage")} icon={Pencil} disabled={busy} onPress={() => (closeMenu(), setDraft(text))} />
      </MenuPanel>
    </View>
  );
}

function AssistantMessage({ m, done, onRegenerate }: { m: UIMessage; done: boolean; onRegenerate?: () => void }) {
  const { t } = useTranslation("coach");
  const text = plainText(m);
  // A turn that failed before saying or looking up anything has nothing to show: the error card below says what happened.
  if (!text && !m.parts.some((p) => p.type.startsWith("tool-"))) return null;
  return (
    <View className="min-w-0 gap-3">
      {m.parts.map((p, i) => (
        <PartView key={i} part={p} />
      ))}
      {done && (!!text || onRegenerate) && (
        <View className="-ml-3 flex-row">
          {!!text && <IconAction label={t("chat.copyAnswer")} icon={Copy} onPress={() => void copy(text)} />}
          {!!text && <IconAction label={t("chat.shareAnswer")} icon={Share2} onPress={() => void Share.share({ message: text }).catch(() => {})} />}
          {onRegenerate && <IconAction label={t("chat.regenerate")} icon={RotateCcw} onPress={onRegenerate} />}
        </View>
      )}
    </View>
  );
}

function Empty({ suggestions, onAsk }: { suggestions: CoachSuggestion[]; onAsk: (text: string) => void }) {
  const { t } = useTranslation("coach");
  // The mark and question fill the space above; the suggestions sit just over the composer, where the thumb is, as
  // ChatGPT and Claude lay out a new chat.
  return (
    <View className="flex-1 justify-between gap-8 py-6">
      <View className="flex-1 items-center justify-center">
        <CoachMark size={48} />
        <Text accessibilityRole="header" className="mt-5 text-center text-title font-bold">
          {t("chat.emptyTitle")}
        </Text>
        <Text className="mt-2 max-w-[340px] text-center text-body text-foreground-secondary">{t("chat.emptyBody")}</Text>
      </View>
      <View className="w-full gap-2">
        {suggestions.map((s) => (
          <Press key={s.key} accessibilityRole="button" onPress={() => onAsk(s.text)} activeBg="bg-fill-hover" className="min-h-14 flex-row items-center gap-3 rounded-2xl border border-border px-4 py-3">
            <Icon icon={SUGGESTION_ICONS[s.key]} size={20} tone="coach-text" />
            <Text className="flex-1 text-body text-foreground">{s.text}</Text>
            <Icon icon={ChevronRight} size={16} tone="muted-foreground" />
          </Press>
        ))}
      </View>
    </View>
  );
}

export type CoachProps = {
  id: string;
  initial: UIMessage[];
  /** Fills the composer without sending (`?q=`). */
  prefill: string;
  /** Sends `prefill` at once (`?brief=1`, `?send=1`). */
  auto: boolean;
  activity?: CoachActivity;
  suggestions: CoachSuggestion[];
  /** After the first answer of a new chat: the screen records the chat's id (`/coach?c=`). */
  onSaved: (id: string) => void;
};

export function Coach({ id, initial, prefill, auto, activity, suggestions, onSaved }: CoachProps) {
  const { t } = useTranslation("coach");
  const { c } = useTheme();
  const bottom = Math.max(useSafeAreaInsets().bottom, COMPOSER_GAP);
  const { ref: keyboardRef, onLayout: measureKeyboard, inset: keyboardInset } = useKeyboardInset();
  const [input, setInput] = useState(prefill);
  const [error, setError] = useState<string | null>(null);
  const scroll = useRef<ScrollView>(null);
  const [transport] = useState(deviceTransport);
  const { messages, sendMessage, regenerate, status, stop } = useChat({
    id,
    messages: initial,
    transport,
    throttle: 50,
    onError: (e) => setError(errorText(e)),
    onFinish: ({ message }) => {
      const words = plainText(message);
      if (words) AccessibilityInfo.announceForAccessibility(words);
      if (initial.length === 0 || activity) onSaved(id);
    },
  });
  const busy = status === "submitted" || status === "streaming";
  // The chat follows the latest message while the person is at it, through a streaming answer too (its height grows
  // on every chunk); scrolled up to read, it stays put and a button jumps back down. Only the person's own drag decides
  // "away": the chat's own scrolls to the end are ignored. Reading every scroll event toggled the button on and off
  // while an answer streamed (the offset lags each chunk), and mounting it that fast ran the app out of memory.
  const atEnd = useRef(true);
  const [away, setAway] = useState(false);
  const awayRef = useRef(false);
  const dragging = useRef(false);
  const setAwayOnce = (next: boolean) => {
    if (awayRef.current === next) return;
    awayRef.current = next;
    setAway(next);
  };
  const toEnd = (animated = true) => {
    atEnd.current = true;
    setAwayOnce(false);
    requestAnimationFrame(() => scroll.current?.scrollToEnd({ animated }));
  };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!dragging.current) return;
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const near = contentOffset.y + layoutMeasurement.height >= contentSize.height - AT_END;
    atEnd.current = near;
    setAwayOnce(!near);
  };
  /** The content grew (a chunk, a new message) or the view shrank (the keyboard): stay at the end if the person was there. */
  const follow = () => {
    if (atEnd.current) scroll.current?.scrollToEnd({ animated: false });
  };
  // Editing a sent message: following stops, and once the keyboard is up the field is scrolled into view (the
  // keyboard otherwise pushes the chat to its end, away from the message being edited).
  const content = useRef<View>(null);
  const editing = useRef<View | null>(null);
  const onEditing = (v: View | null) => {
    editing.current = v;
    if (v) atEnd.current = false;
  };
  useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidShow", () => {
      const v = editing.current;
      if (v && content.current) v.measureLayout(content.current, (_x, y) => scroll.current?.scrollTo({ y: Math.max(0, y - 16), animated: true }), () => {});
    });
    return () => sub.remove();
  }, []);
  // While an answer streams, follow it a few times a second rather than on every chunk.
  useEffect(() => {
    if (status !== "streaming") return;
    const id = setInterval(follow, 400);
    return () => clearInterval(id);
  }, [status]);
  useEffect(() => {
    if (atEnd.current) requestAnimationFrame(() => scroll.current?.scrollToEnd({ animated: true }));
  }, [messages.length, status]);

  const send = (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    setError(null);
    setInput("");
    toEnd();
    void sendMessage({ text: t, ...(activity && { metadata: { activity } }) });
  };
  // An at-once question (`?brief=1`, `?send=1`) is asked once.
  const asked = useRef(false);
  useEffect(() => {
    if (!auto || asked.current) return;
    asked.current = true;
    send(prefill);
  });
  const again = (messageId?: string) => {
    if (busy) return;
    setError(null);
    void regenerate(messageId ? { messageId } : undefined);
  };
  const lastAnswer = messages.at(-1)?.role === "assistant" ? messages.at(-1)!.id : null;

  return (
    // The keyboard lifts the chat and the composer by however much of the screen it covers (src/ui/keyboard.ts).
    <View ref={keyboardRef} onLayout={measureKeyboard} style={{ flex: 1, paddingBottom: keyboardInset }}>
      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onScroll={onScroll}
        scrollEventThrottle={100}
        onScrollBeginDrag={() => (dragging.current = true)}
        onMomentumScrollEnd={() => (dragging.current = false)}
        onScrollEndDrag={(e) => {
          // A drag that ends without a fling has no momentum end; with one, the momentum end clears it.
          if (!e.nativeEvent.velocity || Math.abs(e.nativeEvent.velocity.y) < 0.05) dragging.current = false;
        }}
        onLayout={follow}
        className="flex-1"
        contentContainerClassName="grow px-4 pb-6 pt-2"
      >
        {messages.length === 0 ? (
          <Empty suggestions={suggestions} onAsk={send} />
        ) : (
          <View ref={content} collapsable={false} accessibilityLabel={t("chat.chatLabel")} className="mt-2 gap-6">
            {messages.map((m, i) =>
              m.role === "user" ? (
                <UserMessage key={m.id} m={m} busy={busy} onEditing={onEditing} onEdit={(text) => !busy && (setError(null), toEnd(), void sendMessage({ text, messageId: m.id, metadata: m.metadata }))} />
              ) : (
                <AssistantMessage key={m.id} m={m} done={!busy || i < messages.length - 1} onRegenerate={!busy && m.id === lastAnswer ? () => again(m.id) : undefined} />
              ),
            )}
            {status === "submitted" && (
              <Caption live>{t("chat.thinking")}</Caption>
            )}
          </View>
        )}
        {!!error && (
          <View accessibilityRole="alert" className="mt-6 flex-row items-center gap-3 rounded-xl border border-recovery-red/25 bg-recovery-red/12 py-2 pl-4 pr-2">
            <Text className="flex-1 py-1 text-meta text-foreground">{error}</Text>
            <Pill label={t("chat.retry")} disabled={busy} onPress={() => again()} icon={<Icon icon={RotateCcw} size={16} />} />
          </View>
        )}
      </ScrollView>
      {/* Scrolled up from the latest message: a round button over the composer jumps back down. */}
      {away && messages.length > 0 && (
        <View pointerEvents="box-none" className="items-center" style={{ marginTop: -56, height: 56 }}>
          <Press accessibilityRole="button" accessibilityLabel={t("chat.jumpLatest")} onPress={() => toEnd()} className="size-10 items-center justify-center rounded-full border border-border bg-popover">
            <Icon icon={ArrowDown} size={18} tone="foreground" />
          </Press>
        </View>
      )}
      {/* The composer: a rounded field with Send (or Stop while answering), over the safe area. */}
      <View className="shrink-0 px-4 pt-2" style={{ paddingBottom: keyboardInset ? COMPOSER_GAP : bottom }}>
        <View className="flex-row items-end gap-1.5 rounded-[28px] border border-border bg-card p-1.5">
          <TextInput
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={2000}
            placeholder={t("chat.placeholder")}
            placeholderTextColor={c["muted-foreground"]}
            accessibilityLabel={t("chat.askLabel")}
            submitBehavior="submit"
            returnKeyType="send"
            onSubmitEditing={() => send(input)}
            cursorColor={c.coach}
            className="max-h-40 min-h-11 flex-1 py-3 pl-4 text-body text-foreground"
          />
          {busy ? (
            <Press accessibilityRole="button" accessibilityLabel={t("chat.stop")} onPress={() => void stop()} className="size-11 items-center justify-center rounded-full bg-secondary">
              <Icon icon={Square} size={14} />
            </Press>
          ) : (
            <Press accessibilityRole="button" accessibilityLabel={t("chat.send")} disabled={!input.trim()} onPress={() => send(input)} className={cn("size-11 items-center justify-center rounded-full bg-primary", !input.trim() && "opacity-40")}>
              <Icon icon={ArrowUp} size={20} tone="primary-foreground" strokeWidth={2.25} />
            </Press>
          )}
        </View>
      </View>
    </View>
  );
}
