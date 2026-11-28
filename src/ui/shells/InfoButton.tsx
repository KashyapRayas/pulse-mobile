import { useTranslation } from "react-i18next";
import { useState, type ReactNode } from "react";
import { Info } from "lucide-react-native";
import { useTheme } from "../theme";
import { InfoDialog, type InfoContent } from "./InfoDialog";
import { Press } from "../Press";
import { HeaderButton } from "./Header";

export type { InfoContent };

/**
 * Info trigger and its centred info card (spec §4.8). `card`: 32 px visual inside a 44 px hit area (card headers).
 * `header`: the "i" in a glass header button (DetailHeader, LN9).
 */
export function InfoButton({ info, label, variant }: { info: InfoContent; label: string; variant: "card" | "header" }) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation("ui");
  const { c } = useTheme();
  const header = variant === "header";
  if (header)
    return (
      <>
        <HeaderButton accessibilityRole="button" accessibilityLabel={t("info.about", { label })} onPress={() => setOpen(true)}>
          <Info size={20} color={c.foreground} strokeWidth={1.75} />
        </HeaderButton>
        <InfoDialog open={open} onClose={() => setOpen(false)} {...info} />
      </>
    );
  return (
    <>
      <Press
        activeScale={0.96}
        accessibilityRole="button"
        accessibilityLabel={t("info.about", { label })}
        onPress={() => setOpen(true)}
        // A 44 px hit area pulled into the card header's padding, as the web's -my-1 -mr-2 size-8 + after:-inset-1.5.
        hitSlop={6}
        className="-my-1 -mr-2 size-8 items-center justify-center rounded-full"
      >
        <Info size={16} color={c["muted-foreground"]} strokeWidth={1.75} />
      </Press>
      <InfoDialog open={open} onClose={() => setOpen(false)} {...info} />
    </>
  );
}

/** Any element as the trigger of an info card (Home's day banner, "Add activity"). */
export function InfoCardTrigger({ info, className, children, accessibilityLabel, activeScale }: { info: InfoContent; className?: string; children: ReactNode; accessibilityLabel?: string; activeScale?: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Press accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={() => setOpen(true)} activeScale={activeScale} className={className}>
        {children}
      </Press>
      <InfoDialog open={open} onClose={() => setOpen(false)} {...info} />
    </>
  );
}
