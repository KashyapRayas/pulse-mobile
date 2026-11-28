import { createContext, useContext, type ComponentProps } from "react";
import { Platform, Text as RNText, StyleSheet, useWindowDimensions, type TextStyle } from "react-native";
import { cssInterop } from "nativewind";
import { FACES, hasColorClass, readFont, type Face } from "./fontClasses";

// The web app sets type with classes (font-numeric font-bold) and the browser picks the right font file. React Native
// cannot: a custom font is chosen by its exact family name ("Barlow_700Bold"), and fontWeight is ignored or, on
// Android, can even fall back to the system font. So this <Text> reads the font classes off `className`, drops them
// and sets `fontFamily` itself. Nested <Text> inherits the family and weight of its parent unless it names its own,
// as CSS does. Everything else in `className` (size, colour, tracking ...) goes to NativeWind untouched.

/** Ascent plus descent, in em, of Inter (0.97 + 0.24, its hhea metrics): the font's own line height. */
const NATURAL = 1.21;

/** Numerals line up in columns: Inter's tabular figures, as Linear sets numbers. */
const TABULAR: TextStyle = { fontVariant: ["tabular-nums"] };

/**
 * Type eases down on phones narrower than the iPhone 17 (402 pt), linearly to 96 % at 360 pt and below; 402 and up are
 * unchanged. Only 4 %: the scale is already a phone's (16 px rows), and a smaller phone is held no further from the eye.
 */
export function typeScale(width: number) {
  return Math.min(1, Math.max(0.96, 0.96 + ((width - 360) / 42) * 0.04));
}

/**
 * Applies the type scale to the style NativeWind resolved from the classes (cssInterop below, so it sees the real font
 * size, line height and tracking). On iOS it also places a line shorter than the font's own height (`leading-none`, a
 * 64 px numeral on a 64 px line) where CSS does: iOS keeps the descent and cuts the top, so the glyphs ride up by half
 * the difference (React Native's RCTApplyBaselineOffset returns early in that case), while CSS and Android split it
 * evenly. `drop` is false for nested text, a span of its parent's layout.
 */
function ScaledText({ style, drop, ...props }: ComponentProps<typeof RNText> & { drop: boolean }) {
  const k = typeScale(useWindowDimensions().width);
  const s = StyleSheet.flatten(style) as TextStyle | undefined;
  const scaled: TextStyle | null =
    k < 1 && s
      ? {
          ...(s.fontSize ? { fontSize: s.fontSize * k } : null),
          ...(s.lineHeight ? { lineHeight: s.lineHeight * k } : null),
          ...(typeof s.letterSpacing === "number" ? { letterSpacing: s.letterSpacing * k } : null),
        }
      : null;
  const size = (scaled?.fontSize ?? s?.fontSize) as number | undefined;
  const line = (scaled?.lineHeight ?? s?.lineHeight) as number | undefined;
  const shift = drop && Platform.OS === "ios" && size && line && line < NATURAL * size ? (NATURAL * size - line) / 2 : 0;
  if (!scaled && !shift) return <RNText {...props} style={style} />;
  const transform = shift ? [...(Array.isArray(s?.transform) ? s.transform : []), { translateY: shift }] : undefined;
  return <RNText {...props} style={[style, scaled, transform ? { transform } : null]} />;
}
cssInterop(ScaledText, { className: "style" });

const FaceContext = createContext<Face>({ family: "sans", weight: "regular" });
/** True inside another <Text>: nested text inherits its parent's colour natively, so only the outermost one needs a default. */
const NestedContext = createContext(false);

export function Text({ className, style, numberOfLines, ...props }: ComponentProps<typeof RNText>) {
  const inherited = useContext(FaceContext);
  const nested = useContext(NestedContext);
  const { face, rest, lines, shrink } = readFont(className, inherited);
  return (
    <NestedContext.Provider value>
      <FaceContext.Provider value={face}>
        <ScaledText
          {...props}
          drop={!nested}
          className={nested || hasColorClass(rest) ? rest : `${rest} text-foreground`}
          numberOfLines={numberOfLines ?? lines}
          style={[
            { fontFamily: FACES[face.family][face.weight], flexShrink: nested ? undefined : shrink },
            face.family === "numeric" && TABULAR,
            style,
          ]}
        />
      </FaceContext.Provider>
    </NestedContext.Provider>
  );
}
