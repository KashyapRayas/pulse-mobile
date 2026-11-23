import type { ReactNode } from "react";
import { useWindowDimensions, View } from "react-native";
import { typeScale } from "./Text";

/** Each step's line height (tailwind.config.js `fontSize`). */
export const LINE_HEIGHT = { label: 16, caption: 18, meta: 20, body: 22, heading: 24 } as const;

/**
 * An icon beside text that can wrap (a chip, a note, a warning, a link with its arrow), centred on the text's first line
 * rather than on the whole block. On two lines a centred icon floats between them. Put it in a row with `items-start`.
 * `step` is the text's type step, whose line height the box takes.
 */
export function LineIcon({ step, children }: { step: keyof typeof LINE_HEIGHT; children: ReactNode }) {
  // The text's line grows with the phone's font size and eases down on narrow phones (Text's typeScale): the box does too.
  const { width, fontScale } = useWindowDimensions();
  return (
    <View accessibilityElementsHidden className="shrink-0 justify-center" style={{ height: LINE_HEIGHT[step] * fontScale * typeScale(width) }}>
      {children}
    </View>
  );
}
