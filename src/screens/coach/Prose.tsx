// The coach's answer text, ported from pulse src/app/(app)/coach/Prose.tsx (via halo): paragraphs, bullet and numbered
// lists, **bold**. Built from parsed strings into Text, so model output is never interpreted as markup. Selectable, so
// a long press copies it.
import { useMemo } from "react";
import { View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { DURATION } from "@/ui/motion";
import { parseProse, type Span } from "@/coach/prose";
import { Text } from "@/ui/Text";

const BODY = "text-body text-foreground";

const Spans = ({ spans }: { spans: Span[] }) => (
  <>
    {spans.map((s, i) =>
      s.bold ? (
        <Text key={i} className={`${BODY} font-semibold`}>
          {s.text}
        </Text>
      ) : (
        s.text
      ),
    )}
  </>
);

/**
 * `space-y-3 text-body`; lists `space-y-1.5`, faint markers. `live` while the answer streams: each new paragraph or list
 * fades in as it arrives (a block already shown keeps growing in place).
 */
export function Prose({ text, live }: { text: string; live?: boolean }) {
  const blocks = useMemo(() => parseProse(text), [text]);
  const entering = live ? FadeIn.duration(DURATION.enter) : undefined;
  return (
    <View className="gap-3">
      {blocks.map((b, i) =>
        b.kind === "p" ? (
          <Animated.View key={i} entering={entering}>
            <Text selectable className={BODY}>
              <Spans spans={b.spans} />
            </Text>
          </Animated.View>
        ) : (
          <Animated.View key={i} entering={entering} className="gap-1.5">
            {b.items.map((item, k) => (
              <View key={k} className="flex-row">
                <Text className={b.kind === "ul" ? "w-5 text-body text-muted-foreground" : "w-6 font-numeric text-body font-semibold text-muted-foreground"}>{b.kind === "ul" ? "•" : `${k + 1}.`}</Text>
                <Text selectable className={`${BODY} flex-1`}>
                  <Spans spans={item} />
                </Text>
              </View>
            ))}
          </Animated.View>
        ),
      )}
    </View>
  );
}
