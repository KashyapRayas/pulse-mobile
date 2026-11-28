// Onboarding's buttons, stacked as Linear's sign-in choices (LN12): full-width, 48 px, 8 px apart, so the gaps between them
// are equal. Connect is an outline button with Health Connect's official icon, so the step reads as Health Connect's; a
// second choice ("Explore with sample data") is a filled secondary button; a way out ("Not now") is a text button
// under them. Labels are 16 px, the app's row size.
import { useTranslation } from "react-i18next";
import { ActivityIndicator, View } from "react-native";
import { haptic } from "@/ui/haptics";
import { Press } from "@/ui/Press";
import { Text } from "@/ui/Text";
import { useTheme } from "@/ui/theme";
import { HealthConnectMark } from "@/ui/HealthConnectMark";

/** "Connect Health Connect": an outline pill with the Google Health mark (Fitbit data reaches Health Connect through the Google Health app), label in the foreground token. */
export function ConnectButton({ label, pending, onPress }: { label?: string; pending?: boolean; onPress: () => void }) {
  const { c } = useTheme();
  const { t } = useTranslation("onboarding");
  return (
    <Press
      accessibilityRole="button"
      accessibilityState={{ disabled: !!pending, busy: !!pending }}
      disabled={pending}
      activeScale={0.96}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      className="h-12 w-full flex-row items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 dark:border-input dark:bg-input/30"
    >
      {pending ? <ActivityIndicator size="small" color={c.foreground} /> : <HealthConnectMark size={20} />}
      <Text className="text-body font-semibold text-foreground">{label ?? t("connect.button")}</Text>
    </Press>
  );
}

/** A second choice beside Connect ("Explore with sample data"): full-width, filled, the same 48 px. */
export function SecondaryButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Press accessibilityRole="button" disabled={disabled} activeScale={0.96} onPress={onPress} className="h-12 w-full items-center justify-center rounded-xl bg-secondary px-4">
      <Text className="text-body font-semibold text-foreground">{label}</Text>
    </Press>
  );
}

/** A way out under the buttons ("Not now", "Start workout"): text only, a 48 px tall target. */
export function TextButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <View className="items-center">
      <Press accessibilityRole="button" disabled={disabled} activeOpacity={0.6} onPress={onPress} className="h-12 justify-center px-4">
        <Text className="text-body font-medium text-foreground-secondary">{label}</Text>
      </Press>
    </View>
  );
}
