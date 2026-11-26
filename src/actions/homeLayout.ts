// Customize Home's layout, kept on the phone as My Dashboard's list is (src/actions/dashboard.ts): AsyncStorage
// "pulse.homeLayout", read once, normalized on every read (src/lib/homeLayout.ts) and the default stored as nothing, so
// a section added in a later version still reaches it in its default place.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { HOME_DEFAULT, isDefaultLayout, normalizeLayout, type HomeLayout } from "@/lib/homeLayout";
import type { ActionResult } from "./journal";

export const HOME_LAYOUT_KEY = "pulse.homeLayout";

/** undefined until read. */
let saved: HomeLayout | undefined;

const parse = (raw: string | null): HomeLayout => {
  try {
    return normalizeLayout(raw ? JSON.parse(raw) : null);
  } catch {
    return HOME_DEFAULT;
  }
};

/** The saved layout, or the default. */
export async function homeLayout(): Promise<HomeLayout> {
  if (saved === undefined) saved = parse(await AsyncStorage.getItem(HOME_LAYOUT_KEY).catch(() => null));
  return saved;
}

/** Saves the layout; the default removes the stored one. */
export async function saveHomeLayout(layout: HomeLayout): Promise<ActionResult> {
  const next = normalizeLayout(layout);
  if (isDefaultLayout(next)) await AsyncStorage.removeItem(HOME_LAYOUT_KEY);
  else await AsyncStorage.setItem(HOME_LAYOUT_KEY, JSON.stringify(next));
  saved = next;
  return { ok: true, data: undefined };
}
