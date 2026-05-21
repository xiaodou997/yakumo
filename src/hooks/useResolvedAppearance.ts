import { resolveAppearance } from "../lib/theme/appearance";
import { useYakuSettings } from "../lib/yaku-settings";
import { usePreferredAppearance } from "./usePreferredAppearance";

export function useResolvedAppearance() {
  const preferredAppearance = usePreferredAppearance();
  const settings = useYakuSettings();
  return resolveAppearance(preferredAppearance, settings.appearance);
}
