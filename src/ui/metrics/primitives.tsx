import { useState } from "react";
import { View } from "react-native";
import { Check, CircleAlert, Triangle, TriangleAlert, type LucideIcon } from "lucide-react-native";
import { CHIP_TONE_CLASS, type ChipTone, type DeltaDir, type Tone } from "@/lib/bands";
import { isSymbolUnit, unitLabel } from "@/lib/format";
import { TAG_COPY } from "@/lib/reasons";
import { cn } from "../cn";
import { Icon } from "../Icon";
import type { Family } from "../fontClasses";
import type { TokenName } from "../palette";
import { Text } from "../Text";
import { useTheme } from "../theme";
import { LineIcon } from "../LineIcon";

// Small shared marks used by every kit component (spec §5.0). One look per meaning.

/** A stat's or a chart's own label ("Typical range", "Hours of sleep"): 14 px medium. A list row's title is TYPE.rowTitle. */
export const LABEL = "text-meta font-medium";
/** A note or a row's second line: TYPE.rowSub, 14 px muted (Linear's secondary text). */
export const CAPTION = "text-meta text-muted-foreground";
/**
 * The web's CAP_TRIM (`leading-none` and `text-box: trim-both cap alphabetic`): the text's box runs from the capital
 * height to the baseline, so a margin measures from the letters themselves. React Native has no text-box-trim, so this
 * sets a 1 em line and cuts it with negative margins from the fonts' metrics (ascent 1.0 / 0.95 em, descent 0.2 / 0.25
 * em for Barlow / Figtree, capital height 0.7 em for both), with the glyphs placed as CSS places them (<Text> does that
 * on iOS). Add a margin of your own to the returned one.
 */
export function capTrim(fontSize: number, family: Family = "sans") {
  const [ascent, descent] = family === "numeric" ? [1, 0.2] : [0.95, 0.25];
  const half = (1 - ascent - descent) / 2; // the half-leading of a 1 em line (negative)
  return { lineHeight: fontSize, marginTop: -(half + ascent - 0.7) * fontSize, marginBottom: -(half + descent) * fontSize };
}

export type TagKind = keyof typeof TAG_COPY | "so_far" | "partial_week" | "partial_month" | "estimate" | "beta";

const CHIP_ICON: Record<ChipTone, LucideIcon | null> = { optimal: Check, warning: TriangleAlert, alert: CircleAlert, neutral: null };

/**
 * Value plus tone, e.g. "✓ Within 16.1 to 16.9". Icon follows the tone unless `delta` is given. Children may be text or
 * nested <Text>. Never wider than its column: a long label wraps inside the chip, as many lines as it needs, with the mark
 * held on the first line; a range keeps together (its non-breaking spaces, valueRange in src/lib/format.ts).
 */
export function StatusChip({ tone, children, delta, className, textClassName }: { tone: ChipTone; children: React.ReactNode; delta?: DeltaDir; className?: string; textClassName?: string }) {
  // CHIP_TONE_CLASS is "bg-... text-..." for the web, where the text colour inherits; here the two go to different elements.
  const classes = CHIP_TONE_CLASS[tone].split(" ");
  const bg = classes.find((k) => k.startsWith("bg-"));
  const text = classes.find((k) => k.startsWith("text-")) ?? "";
  const glyph = CHIP_ICON[tone];
  const [room, setRoom] = useState<number | null>(null);
  // The chip's own width before any cap. A row that shrink-wraps the chip (a chip beside a value in a horizontal row)
  // reports the chip's width as its room, so the cap applies only where the room is narrower than the chip would be:
  // otherwise the chip squeezed itself into two lines ("No / data") beside free space.
  const [natural, setNatural] = useState<number | null>(null);
  const capped = room !== null && natural !== null && room < natural - 0.5;
  // What the text may use of the room: the chip's sides (px-2, or the caller's px-*), then the mark and its 6 px gap.
  const sides = 8 * Number(/(?:^|\s)px-(\d+(?:\.\d+)?)(?:\s|$)/.exec(className ?? "")?.[1] ?? 2);
  const markWidth = delta ? (delta === "flat" ? 6 : 8) + 6 : glyph ? (/\btext-label\b/.test(textClassName ?? "") ? 12 : 14) + 6 : 0;
  // The mark sits on the first line (LineIcon), 6 px from the text, so a chip that wraps in a narrow tile keeps it beside
  // the first line rather than floating between the two.
  const step = /\btext-label\b/.test(textClassName ?? "") ? "label" : /\btext-meta\b/.test(textClassName ?? "") ? "meta" : "caption";
  const mark = delta ? <DeltaMark dir={delta} tone="neutral" color={text.slice(5) as TokenName} /> : glyph && <Icon icon={glyph} size={step === "label" ? 12 : 14} tone={text.slice(5) as TokenName} strokeWidth={2.5} />;
  // The chip hugs its text but never outgrows its column, wrapping rather than cutting the label short. A percentage or flex-shrink
  // limit is not enough on Android: text in a shrinking row is measured once, at its one-line width, and drawn that way
  // past the chip. So the row around the chip (which takes the column's width, a column stretches it, and carries the
  // caller's placement: self-*, margins) reports its width; the chip takes it as a px maxWidth, and the text that less
  // the chip's padding and mark, so Android measures the text wrapped to fit.
  // The row always spans its column (self-stretch), so it measures the room and not the chip; the caller's alignment
  // (self-center, self-end) becomes the row's justify, its margins stay on the row. In a horizontal parent the row
  // centres the chip vertically, as that parent's items-center did.
  const parts = (className ?? "").split(/\s+/).filter(Boolean);
  const place = parts.filter((k) => /^-?(?:self|m[trblxy]?)-/.test(k));
  const inner = parts.filter((k) => !place.includes(k)).join(" ");
  const justify = place.includes("self-center") ? "justify-center" : place.includes("self-end") ? "justify-end" : "justify-start";
  const margins = place.filter((k) => !k.startsWith("self-")).join(" ");
  return (
    <View className={cn("max-w-full flex-row items-center self-stretch", justify, margins)} onLayout={(e) => setRoom(e.nativeEvent.layout.width)}>
      <View className={cn("min-h-6 flex-row items-start gap-1.5 rounded-md px-2 py-1", bg, inner)} style={capped ? { maxWidth: room } : undefined} onLayout={(e) => !capped && setNatural(e.nativeEvent.layout.width)}>
        {!!mark && <LineIcon step={step}>{mark}</LineIcon>}
        <Text className={cn("shrink text-caption font-bold tabular-nums", text, textClassName)} style={capped ? { maxWidth: Math.max(0, room - sides - markWidth + 1) } : undefined}>
          {children}
        </Text>
      </View>
    </View>
  );
}

const DELTA_TONE: Record<Tone, TokenName> = { good: "optimal-text", bad: "warning-text", neutral: "foreground-secondary" };

/** Filled 8 px triangle (up/down), or a 6 px dot when flat. `color` overrides the tone's colour (a chip's own text colour). */
export function DeltaMark({ dir, tone, color }: { dir: DeltaDir; tone: Tone; color?: TokenName }) {
  const { c } = useTheme();
  if (dir === "flat") return <View accessibilityElementsHidden className="size-1.5 shrink-0 rounded-full bg-muted-foreground" />;
  const fill = c[color ?? DELTA_TONE[tone]];
  return (
    <View accessibilityElementsHidden style={dir === "down" ? { transform: [{ rotate: "180deg" }] } : undefined}>
      <Triangle size={8} color={fill} fill={fill} strokeWidth={0} />
    </View>
  );
}

/** A formatted value with its unit in the unit role ("124 ms", "72%"). Nest it inside a <Text>; it renders as one. */
/** The advance of a space in Figtree SemiBold at 13 px (0.241 em). */
const SPACE_13 = 0.241 * 13;

/**
 * `fit`: one line, the type scaled down to the width it is given rather than breaking inside the number (a phone has no room for text running past its column at 320 px).
 */
export function ValueUnit({ value, unit, className, unitClassName, fit }: { value: string; unit?: string; className?: string; unitClassName?: string; fit?: boolean }) {
  return (
    <Text className={cn("whitespace-nowrap tabular-nums", className)} numberOfLines={fit ? 1 : undefined} adjustsFontSizeToFit={fit}>
      {value}
      {!!unit && value !== "--" && (
        <>
          {/* The web's ml-0.5 before a symbol, ml-1 before a word. A nested text has no margin, so the gap is a space of
              a known face and size (Figtree SemiBold 13 px: 0.241 em, 3.13 px) with letter spacing making up the rest. */}
          <Text className="font-sans text-meta font-semibold" style={{ letterSpacing: (isSymbolUnit(unit) ? 2 : 4) - SPACE_13 }}>{" "}</Text>
          <Text className={cn("text-meta font-semibold text-foreground-secondary", unitClassName)}>{unitLabel(unit)}</Text>
        </>
      )}
    </Text>
  );
}
