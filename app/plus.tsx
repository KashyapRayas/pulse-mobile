import { useTranslation } from "react-i18next";
import { useLocalSearchParams } from "expo-router";
import { PlusPage } from "@/screens/home/PlusMenu";

// The menu under My Day's "+" (src/screens/home/PlusMenu.tsx); `label` is "Add to today" or "Add to Mon., Sep. 28".
export default function Plus() {
  const { t } = useTranslation("home");
  const { label, d } = useLocalSearchParams<{ label?: string; d?: string }>();
  return <PlusPage label={label ?? t("add.today")} day={d} />;
}
