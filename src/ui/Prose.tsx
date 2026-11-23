import { useState, type ReactNode } from "react";
import { View } from "react-native";
import Animated, { FadeIn, LinearTransition, useReducedMotion } from "react-native-reanimated";
import { i18n } from "@/i18n/config";
import { cn } from "./cn";
import { haptic } from "./haptics";
import { DURATION, EASE } from "./motion";
import { Press } from "./Press";
import { Text } from "./Text";

// Reading text on a phone, as Linear writes it (docs/design/linear-mobile.md): lead with the one sentence that
// matters, and leave the rest to a tap. A long paragraph opens on its first sentence, set in the foreground; "More"
// fades the rest in beneath it, a step quieter. Short text is shown whole.

/** Below this, a paragraph is short enough to read at a glance and is never folded. */
export const FOLD_MIN = 160;
/** A remainder this short is not worth a tap: the paragraph is shown whole. */
const REST_MIN = 40;
/** Abbreviations whose full stop does not end a sentence (en, de, es, fr, it, pl, pt, ru). */
const ABBREV = /(?:^|[\s(])(?:e\.g|i\.e|vs|etc|approx|ca|cf|Dr|Mr|Ms|Mrs|St|z\.B|d\.h|bzw|usw|p\.ej|ej|env|p\.ex|ex|ecc|ad es|np|tj|itp|т\.е|т\.к|т\.д|т\.п|напр)\.$/i;
/** A sentence ends at . ! ? or … (with any closing quote or bracket) followed by space and a capital, digit or opening mark. */
const BOUNDARY = /[.!?…]["'»”’)\]]*\s+(?=[A-ZÀ-ÖØ-ÞĄĆĘŁŃŚŹŻА-ЯЁ0-9"«“„(¿¡])/g;

/** Splits `text` into its first sentence and the rest, or returns the whole text as the lede when it should not fold. */
export function splitLede(text: string, min = FOLD_MIN): [lede: string, rest: string | null] {
  const s = text.trim();
  if (s.length <= min) return [s, null];
  for (const m of s.matchAll(BOUNDARY)) {
    const at = m.index ?? 0;
    const end = at + m[0].trimEnd().length;
    const lede = s.slice(0, end);
    if (ABBREV.test(lede.slice(0, lede.search(/[.!?…]["'»”’)\]]*$/) + 1))) continue;
    const rest = s.slice(at + m[0].length).trim();
    return rest.length < REST_MIN ? [s, null] : [lede, rest];
  }
  return [s, null];
}

const BODY = "text-body text-foreground-body";
const REST = "text-body text-foreground-secondary";

export type ProseProps = {
  children: string;
  /** Fold a long paragraph to its first sentence (default). False shows it whole, in the body colour. */
  fold?: boolean;
  className?: string;
};

/** One paragraph of reading text. */
export function Prose({ children, fold = true, className }: ProseProps) {
  const [lede, rest] = fold ? splitLede(children) : [children, null];
  const [open, setOpen] = useState(false);
  const reduced = useReducedMotion();
  if (!rest) return <Text className={cn(BODY, className)}>{lede}</Text>;
  const label = i18n.t(open ? "ui:prose.less" : "ui:prose.more");
  return (
    <Animated.View layout={reduced ? undefined : LinearTransition.duration(DURATION.base).easing(EASE.standard)} className="gap-1.5">
      <Text className={cn(BODY, "text-foreground", className)}>{lede}</Text>
      {open && (
        <Animated.View entering={reduced ? undefined : FadeIn.duration(DURATION.base)}>
          <Text className={REST}>{rest}</Text>
        </Animated.View>
      )}
      <Press
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityHint={open ? undefined : rest.slice(0, 80)}
        hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
        activeOpacity={0.6}
        onPress={() => {
          haptic.toggle(!open);
          setOpen(!open);
        }}
        className="self-start"
      >
        <Text className="text-meta font-medium text-muted-foreground">{label}</Text>
      </Press>
    </Animated.View>
  );
}

/** A paragraph: a string folds as <Prose>; nodes (a sentence with a bold span) render as one body <Text>. */
export function P({ children, fold }: { children: ReactNode; fold?: boolean }) {
  if (typeof children === "string") return <Prose fold={fold}>{children}</Prose>;
  return <Text className={BODY}>{children}</Text>;
}

/** Paragraphs with the kit's 12 px rhythm between them. */
export function Paragraphs({ children }: { children: ReactNode }) {
  return <View className="gap-3">{children}</View>;
}
