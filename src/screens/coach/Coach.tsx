import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, Keyboard, Platform, ScrollView, Share, TextInput, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import * as Clipboard from "expo-clipboard";
import Animated, { FadeIn, FadeInDown, interpolateColor, useAnimatedStyle, useDerivedValue, withSpring, withTiming, ZoomIn, ZoomOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useChat } from "@ai-sdk/react";
import type { CoachActivity } from "@/coach/activity";
import type { UIMessage } from "ai";
import { Activity, ArrowDown, ArrowUp, Check, ChevronRight, Copy, CornerDownRight, Dumbbell, Moon, Pencil, Plus, RefreshCw, RotateCcw, Share2, Square, type LucideIcon } from "lucide-react-native";
import type { CoachSuggestion as CoreSuggestion } from "@/core/algorithms/coachSuggestions";
import { plainText } from "@/coach/chats";
import { followUps } from "@/coach/followUps";
import { answerBlocks, toolsUsed } from "@/coach/parts";
import { i18n } from "@/i18n/config";
import { deviceTransport } from "@/coach/session";
import { Mark } from "@/ui/brand";
import { cn } from "@/ui/cn";
import { alpha } from "@/ui/color";
import { Gradient } from "@/ui/Gradient";
import { Icon } from "@/ui/Icon";
import { useKeyboardInset } from "@/ui/keyboard";
import { DURATION, EASE } from "@/ui/motion";
import { Press } from "@/ui/Press";
import { Text } from "@/ui/Text";
import { useTheme } from "@/ui/theme";
import { Evidence } from "./Evidence";
import { Breathing, Shimmer, SNAP, SNAP_SPRING, TypingDots } from "./Motion";
import { Prose } from "./Prose";
import { Sheet, SheetButton } from "./Sheet";
import { ToolSteps } from "./ToolSteps";
import { ToolsSheet } from "./ToolsSheet";
import { haptic } from "@/ui/haptics";
import { toast } from "@/ui/Toast";

type CoachSuggestion = { key: CoreSuggestion["key"]; text: string };
const SUGGESTION_ICONS: Record<CoachSuggestion["key"], LucideIcon> = { brief: Activity, recovery: Activity, training: Dumbbell, hrv: Activity, sleep: Moon, strain: Dumbbell, sync: RefreshCw };

const PROBLEMS = ["limit", "key", "profile", "provider", "server", "network"] as const;
/** The composer's least gap to the screen's bottom edge, and its gap above the keyboard. */
const COMPOSER_GAP = 12;
/** The longest message, and the length from which the composer counts toward it. */
const MAX_LENGTH = 2000;
const COUNT_FROM = 1800;
/** How long Copy shows its check. */
const COPIED_MS = 1600;

/** The sentence for a CoachProblem code (see transport.ts); anything else reads the default. */
const errorText = (e: Error) => {
  const code = PROBLEMS.find((p) => p === e.message.trim());
  return code ? i18n.t(`coach:errors.${code}`) : i18n.t("coach:errors.default");
};

/** Copies text and says so: a haptic, and a toast where Android does not confirm a copy itself. */
async function copy(text: string) {
  await Clipboard.setStringAsync(text);
  haptic.tap();
  // Android 13 and later show their own confirmation of what was copied; a toast of ours would say it twice.
  if (!(Platform.OS === "android" && Number(Platform.Version) >= 33)) toast.success(i18n.t("coach:chat.copied"));
}

/** How near the end (px) still counts as "at the latest message": the chat follows a streaming answer only there. */
const AT_END = 96;

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

/** Before the first word or lookup: the mark breathes beside a shimmering "Thinking…". */
function Thinking() {
  const { t } = useTranslation("coach");
  return (
    <Animated.View entering={FadeIn.duration(SNAP)} accessibilityLiveRegion="polite" className="min-h-6 flex-row items-center gap-2">
      <Breathing>
        <CoachMark size={22} />
      </Breathing>
      <Shimmer>
        <Text className="text-meta text-foreground">{t("chat.thinking")}</Text>
      </Shimmer>
    </Animated.View>
  );
}

function IconAction({ label, icon, onPress, disabled }: { label: string; icon: LucideIcon; onPress: () => void; disabled?: boolean }) {
  return (
    <Press accessibilityRole="button" accessibilityLabel={label} onPress={onPress} disabled={disabled} activeBg="bg-fill-hover" activeScale={0.92} className={cn("size-11 items-center justify-center rounded-full", disabled && "opacity-30")}>
      <Icon icon={icon} size={17} strokeWidth={1.75} tone="muted-foreground" />
    </Press>
  );
}

/** Copy under an answer: its icon turns into a check for a moment, as ChatGPT's does. */
function CopyAction({ text }: { text: string }) {
  const { t } = useTranslation("coach");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(id);
  }, [copied]);
  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={copied ? t("chat.copied") : t("chat.copyAnswer")}
      onPress={() => void copy(text).then(() => setCopied(true))}
      activeBg="bg-fill-hover"
      activeScale={0.92}
      className="size-11 items-center justify-center rounded-full"
    >
      <Animated.View key={copied ? "check" : "copy"} entering={ZoomIn.duration(DURATION.fast)}>
        <Icon icon={copied ? Check : Copy} size={17} strokeWidth={copied ? 2.25 : 1.75} tone={copied ? "optimal-text" : "muted-foreground"} />
      </Animated.View>
    </Press>
  );
}

function Pill({ label, onPress, disabled, primary, icon }: { label: string; onPress: () => void; disabled?: boolean; primary?: boolean; icon?: ReactNode }) {
  return (
    <Press accessibilityRole="button" onPress={onPress} disabled={disabled} activeScale={0.97} className={cn("h-10 flex-row items-center gap-1.5 rounded-full px-4", primary ? "bg-primary" : "bg-secondary", disabled && "opacity-45")}>
      {icon}
      <Text className={cn("text-meta font-semibold", primary ? "text-primary-foreground" : "text-foreground")}>{label}</Text>
    </Press>
  );
}

function UserMessage({ m, busy, fresh, onEdit, onEditing }: { m: UIMessage; busy: boolean; /** Sent in this visit: it rises in. */ fresh: boolean; onEdit: (text: string) => void; /** The edit field opened (its view) or closed (null). */ onEditing: (view: View | null) => void }) {
  const { t } = useTranslation("coach");
  const { c } = useTheme();
  const text = m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
  const [draft, setDraft] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  // Edit opens the field once the sheet has gone: a field under an open modal cannot take the keyboard.
  const editAfter = useRef(false);
  if (draft !== null)
    return (
      <Animated.View entering={FadeIn.duration(SNAP)} className="ml-8 gap-2" ref={onEditing} collapsable={false}>
        <TextInput
          autoFocus
          multiline
          value={draft}
          onChangeText={setDraft}
          maxLength={MAX_LENGTH}
          accessibilityLabel={t("chat.editLabel")}
          cursorColor={c.coach}
          className="max-h-60 min-h-11 rounded-2xl border border-coach/50 bg-secondary px-4 py-3 text-body text-foreground"
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
      </Animated.View>
    );
  // Copy and Edit sit behind a long press on the bubble, as in the chat apps people know (ChatGPT, Claude), in a
  // floating sheet with the message on top; a screen reader gets both as actions.
  return (
    <Animated.View entering={fresh ? FadeInDown.springify().damping(SNAP_SPRING.damping).stiffness(SNAP_SPRING.stiffness).mass(SNAP_SPRING.mass) : undefined} className="items-end pl-8">
      <Press
        accessibilityHint={t("chat.holdHint")}
        accessibilityActions={[{ name: "copy", label: t("chat.copy") }, ...(busy ? [] : [{ name: "edit", label: t("chat.editMessage") }])]}
        onAccessibilityAction={(e) => (e.nativeEvent.actionName === "copy" ? void copy(text) : setDraft(text))}
        onLongPress={() => (Keyboard.dismiss(), setSheet(true))}
        delayLongPress={350}
        activeScale={0.97}
        className="max-w-full rounded-[22px] bg-secondary px-4 py-3"
      >
        <Text className="text-body text-foreground">{text}</Text>
      </Press>
      <Sheet
        open={sheet}
        onClose={() => setSheet(false)}
        onClosed={() => {
          if (!editAfter.current) return;
          editAfter.current = false;
          setDraft(text);
        }}
        title={t("chat.yourMessage")}
      >
        <View className="mb-4 rounded-2xl bg-secondary px-4 py-3">
          <Text numberOfLines={5} className="text-body text-foreground">
            {text}
          </Text>
        </View>
        <View className="flex-row gap-2">
          <SheetButton label={t("chat.copy")} icon={Copy} onPress={() => (setSheet(false), void copy(text))} />
          <SheetButton
            label={t("chat.editMessage")}
            icon={Pencil}
            primary
            disabled={busy}
            onPress={() => {
              editAfter.current = true;
              setSheet(false);
            }}
          />
        </View>
      </Sheet>
    </Animated.View>
  );
}

function AssistantMessage({ m, done, live, onRegenerate }: { m: UIMessage; done: boolean; /** Its words are still arriving. */ live: boolean; onRegenerate?: () => void }) {
  const { t } = useTranslation("coach");
  const text = plainText(m);
  const blocks = answerBlocks(m.parts);
  // A turn that failed before saying or looking up anything has nothing to show: the error card below says what happened.
  if (!blocks.length) return null;
  const tail = blocks.at(-1);
  const endsInText = tail?.kind === "text";
  const running = tail?.kind === "steps" && tail.steps.some((s) => s.state === "running");
  return (
    <View className="min-w-0 gap-3">
      {blocks.map((b, i) =>
        b.kind === "text" ? (
          <Prose key={i} text={b.text} live={live} />
        ) : (
          <View key={i} className="gap-3">
            <ToolSteps steps={b.steps} />
            {b.steps.map((s, k) => (s.state === "done" ? <Animated.View key={k} entering={live ? FadeInDown.duration(SNAP) : undefined}><Evidence name={s.name} output={s.output} /></Animated.View> : null))}
          </View>
        ),
      )}
      {/* Still arriving: dots under the words while text streams, "Thinking…" while it works out what to say after its
          lookups (the stream is open but nothing new has come yet). */}
      {live && endsInText && <TypingDots />}
      {live && !endsInText && !running && <Thinking />}
      {done && (!!text || onRegenerate) && (
        <Animated.View entering={FadeIn.duration(SNAP)} className="-ml-3 flex-row">
          {!!text && <CopyAction text={text} />}
          {!!text && <IconAction label={t("chat.shareAnswer")} icon={Share2} onPress={() => void Share.share({ message: text }).catch(() => {})} />}
          {onRegenerate && <IconAction label={t("chat.regenerate")} icon={RotateCcw} onPress={onRegenerate} />}
        </Animated.View>
      )}
    </View>
  );
}

/** Follow-up questions under the latest answer, picked from what it looked up (followUps.ts); one tap asks. */
function FollowUps({ m, onAsk }: { m: UIMessage; onAsk: (text: string) => void }) {
  const { t } = useTranslation("coach");
  const keys = followUps(toolsUsed(m.parts));
  if (!keys.length) return null;
  return (
    <View accessibilityLabel={t("chat.followUpsLabel")} className="-mt-2 gap-2">
      {keys.map((k, i) => (
        <Animated.View key={k} entering={FadeInDown.delay(40 + i * 40).duration(SNAP)} className="self-start">
          <Press accessibilityRole="button" onPress={() => onAsk(t(`followUps.${k}` as "followUps.dayTrain"))} activeBg="bg-fill-hover" activeScale={0.97} className="min-h-10 flex-row items-center gap-2 rounded-full border border-border px-4 py-2">
            <Icon icon={CornerDownRight} size={15} tone="coach-text" />
            <Text className="shrink text-meta text-foreground">{t(`followUps.${k}` as "followUps.dayTrain")}</Text>
          </Press>
        </Animated.View>
      ))}
    </View>
  );
}

function Empty({ suggestions, onAsk }: { suggestions: CoachSuggestion[]; onAsk: (text: string) => void }) {
  const { t } = useTranslation("coach");
  // The mark and question fill the space above; the suggestions sit just over the composer, where the thumb is, as
  // ChatGPT and Claude lay out a new chat. Each rises in a beat after the one before.
  return (
    <View className="flex-1 justify-between gap-8 py-6">
      <View className="flex-1 items-center justify-center">
        <Animated.View entering={ZoomIn.springify().damping(SNAP_SPRING.damping).stiffness(SNAP_SPRING.stiffness).mass(SNAP_SPRING.mass)}>
          <CoachMark size={48} />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(40).duration(SNAP)}>
          <Text accessibilityRole="header" className="mt-5 text-center text-title font-bold">
            {t("chat.emptyTitle")}
          </Text>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(70).duration(SNAP)}>
          <Text className="mt-2 max-w-[340px] text-center text-body text-foreground-secondary">{t("chat.emptyBody")}</Text>
        </Animated.View>
      </View>
      <View className="w-full gap-2">
        {suggestions.map((s, i) => (
          <Animated.View key={s.key} entering={FadeInDown.delay(100 + i * 35).duration(SNAP)}>
            <Press accessibilityRole="button" onPress={() => onAsk(s.text)} activeBg="bg-fill-hover" activeScale={0.98} className="min-h-14 flex-row items-center gap-3 rounded-2xl border border-border px-4 py-3">
              <Icon icon={SUGGESTION_ICONS[s.key]} size={20} tone="coach-text" />
              <Text className="flex-1 text-body text-foreground">{s.text}</Text>
              <Icon icon={ChevronRight} size={16} tone="muted-foreground" />
            </Press>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

/**
 * The composer: "+" for the tools sheet, the field (its edge turns coach blue while it has focus), and Send (it springs
 * up once there is something to send) or Stop while answering, swapping with a small zoom. Near the limit it counts.
 */
function Composer({ input, setInput, busy, onSend, onStop, onTools }: { input: string; setInput: (v: string) => void; busy: boolean; onSend: () => void; onStop: () => void; onTools: () => void }) {
  const { t } = useTranslation("coach");
  const { c } = useTheme();
  const [focused, setFocused] = useState(false);
  const ready = !!input.trim();
  const focus = useDerivedValue(() => withTiming(focused ? 1 : 0, { duration: DURATION.fast, easing: EASE.standard }));
  const lift = useDerivedValue(() => withSpring(ready ? 1 : 0, SNAP_SPRING));
  const border = c.border;
  const lit = alpha(c.coach, 0.55);
  const edge = useAnimatedStyle(() => ({ borderColor: interpolateColor(focus.value, [0, 1], [border, lit]) }));
  const send = useAnimatedStyle(() => ({ opacity: 0.35 + 0.65 * lift.value, transform: [{ scale: 0.86 + 0.14 * lift.value }] }));
  return (
    <View>
      {input.length >= COUNT_FROM && (
        <Animated.View entering={FadeIn.duration(DURATION.fast)} className="items-end px-3 pb-1">
          <Text className={cn("font-numeric text-caption", input.length >= MAX_LENGTH ? "text-recovery-red-text" : "text-muted-foreground")}>{t("chat.counter", { used: input.length, max: MAX_LENGTH })}</Text>
        </Animated.View>
      )}
      <Animated.View className="flex-row items-end gap-1 rounded-[28px] border bg-card p-1.5" style={edge}>
        <Press accessibilityRole="button" accessibilityLabel={t("tools.open")} onPress={() => (Keyboard.dismiss(), onTools())} activeBg="bg-fill-hover" activeScale={0.92} className="size-11 items-center justify-center rounded-full">
          <Icon icon={Plus} size={21} tone="foreground-secondary" strokeWidth={2} />
        </Press>
        <TextInput
          value={input}
          onChangeText={setInput}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          multiline
          maxLength={MAX_LENGTH}
          placeholder={t("chat.placeholder")}
          placeholderTextColor={c["muted-foreground"]}
          accessibilityLabel={t("chat.askLabel")}
          submitBehavior="submit"
          returnKeyType="send"
          onSubmitEditing={onSend}
          cursorColor={c.coach}
          selectionColor={alpha(c.coach, 0.35)}
          className="max-h-40 min-h-11 flex-1 py-3 pl-1 text-body text-foreground"
        />
        {busy ? (
          <Animated.View key="stop" entering={ZoomIn.duration(DURATION.fast)} exiting={ZoomOut.duration(DURATION.fast)}>
            <Press accessibilityRole="button" accessibilityLabel={t("chat.stop")} onPress={() => (haptic.tap(), onStop())} activeScale={0.9} className="size-11 items-center justify-center rounded-full bg-secondary">
              <Icon icon={Square} size={14} />
            </Press>
          </Animated.View>
        ) : (
          // The zoom in and out on the outer view, the ready scale on the inner one: one view's transform cannot carry both.
          <Animated.View key="send" entering={ZoomIn.duration(DURATION.fast)} exiting={ZoomOut.duration(DURATION.fast)}>
            <Animated.View style={send}>
              <Press accessibilityRole="button" accessibilityLabel={t("chat.send")} accessibilityState={{ disabled: !ready }} disabled={!ready} onPress={onSend} activeScale={0.9} className="size-11 items-center justify-center rounded-full bg-primary">
                <Icon icon={ArrowUp} size={20} tone="primary-foreground" strokeWidth={2.25} />
              </Press>
            </Animated.View>
          </Animated.View>
        )}
      </Animated.View>
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
  const bottom = Math.max(useSafeAreaInsets().bottom, COMPOSER_GAP);
  const [tools, setTools] = useState(false);
  // The messages loaded with the chat stand still; the ones sent in this visit rise in.
  const [loaded] = useState(() => new Set(initial.map((m) => m.id)));
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
    onError: (e) => {
      haptic.error();
      setError(errorText(e));
    },
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
    haptic.tap();
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
  const last = messages.at(-1);
  const lastAnswer = last?.role === "assistant" ? last.id : null;

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
                <UserMessage key={m.id} m={m} busy={busy} fresh={!loaded.has(m.id)} onEditing={onEditing} onEdit={(text) => !busy && (setError(null), toEnd(), void sendMessage({ text, messageId: m.id, metadata: m.metadata }))} />
              ) : (
                <AssistantMessage key={m.id} m={m} done={!busy || i < messages.length - 1} live={status === "streaming" && i === messages.length - 1} onRegenerate={!busy && m.id === lastAnswer ? () => again(m.id) : undefined} />
              ),
            )}
            {/* Thinking until the first word or lookup arrives. */}
            {busy && (status === "submitted" || (last?.role === "assistant" && !answerBlocks(last.parts).length)) && <Thinking />}
            {!busy && !error && last?.role === "assistant" && <FollowUps m={last} onAsk={send} />}
          </View>
        )}
        {!!error && (
          <Animated.View entering={FadeInDown.duration(SNAP)} accessibilityRole="alert" className="mt-6 flex-row items-center gap-3 rounded-xl border border-recovery-red/25 bg-recovery-red/12 py-2 pl-4 pr-2">
            <Text className="flex-1 py-1 text-meta text-foreground">{error}</Text>
            <Pill label={t("chat.retry")} disabled={busy} onPress={() => again()} icon={<Icon icon={RotateCcw} size={16} />} />
          </Animated.View>
        )}
      </ScrollView>
      {/* Scrolled up from the latest message: a round button over the composer zooms in and jumps back down. Its slot
          stays mounted so the button's own exit can play. */}
      {messages.length > 0 && (
        <View pointerEvents="box-none" className="items-center" style={{ marginTop: -56, height: 56 }}>
          {away && (
            <Animated.View entering={ZoomIn.springify().damping(SNAP_SPRING.damping).stiffness(SNAP_SPRING.stiffness).mass(SNAP_SPRING.mass)} exiting={ZoomOut.duration(DURATION.fast)}>
              <Press accessibilityRole="button" accessibilityLabel={t("chat.jumpLatest")} onPress={() => (haptic.select(), toEnd())} activeScale={0.9} className="size-10 items-center justify-center rounded-full border border-border bg-popover">
                <Icon icon={ArrowDown} size={18} tone="foreground" />
              </Press>
            </Animated.View>
          )}
        </View>
      )}
      {/* The composer, over the safe area. */}
      <View className="shrink-0 px-4 pt-2" style={{ paddingBottom: keyboardInset ? COMPOSER_GAP : bottom }}>
        <Composer input={input} setInput={setInput} busy={busy} onSend={() => send(input)} onStop={() => void stop()} onTools={() => setTools(true)} />
      </View>
      <ToolsSheet open={tools} onClose={() => setTools(false)} onAsk={send} disabled={busy} />
    </View>
  );
}
