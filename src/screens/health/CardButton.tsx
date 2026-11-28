// The web's CARD_BUTTON (the 48 px secondary button at a card's foot) and TEXT_LINK (the small coach-coloured link).
import type { ReactNode } from "react";
import { Pressable } from "react-native";
import { ArrowRight } from "lucide-react-native";
import { CARD_BUTTON } from "@/ui/Card";
import { Icon } from "@/ui/Icon";
import { Text } from "@/ui/Text";
import { push } from "@/ui/navigate";
import { Press } from "@/ui/Press";
import { LineIcon } from "@/ui/LineIcon";

export function CardButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Press activeScale={0.96} accessibilityRole="link" onPress={() => push(href)} className={CARD_BUTTON}>
      <Text className="text-meta font-medium tracking-normal">{children}</Text>
    </Press>
  );
}

/** "View trend →": the web's hit area reaches 14 px above and below. */
export function TextLink({ href, children }: { href: string; children: string }) {
  return (
    <Pressable accessibilityRole="link" onPress={() => push(href)} hitSlop={{ top: 14, bottom: 14, left: 4, right: 4 }} className="flex-row items-start gap-1.5 self-start">
      <Text className="text-caption font-medium tracking-normal text-coach-text">{children}</Text>
      <LineIcon step="caption"><Icon icon={ArrowRight} size={14} tone="coach-text" strokeWidth={2} /></LineIcon>
    </Pressable>
  );
}
