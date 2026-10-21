import { Host, isDynamicColorAvailable } from "@expo/ui/jetpack-compose";

import { useSettingNumber } from "@/contexts/display-settings-context";
import { materialSeed } from "@/domain/material-accent";
import { useMaterialRevision } from "@/theme/material-revision";
import { useIsDark } from "@/theme/use-is-dark";

import type { MaterialHostProps } from "./material-host";

export type { MaterialHostProps } from "./material-host";

/**
 * The app's resolved scheme, seeded like `use-accent.android.ts` so Compose and RN start from one scheme.
 * Keyed on the scheme revision: Compose reads the wallpaper palette only while composing, so without the
 * remount the controls keep the old colours until restart.
 */
export function MaterialHost(props: MaterialHostProps) {
    const isDark = useIsDark();
    const seedColor = materialSeed(useSettingNumber("accentColor"), isDynamicColorAvailable);
    const revision = useMaterialRevision();

    return <Host key={revision} {...props} colorScheme={isDark ? "dark" : "light"} seedColor={seedColor} />;
}
