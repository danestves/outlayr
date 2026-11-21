import { isDynamicColorAvailable } from "@expo/ui/jetpack-compose";

import { defaultMaterialAccentValue, materialAccentOptions } from "@/domain/material-accent";
import type { AccentOption } from "@/domain/material-accent";

/** "Wallpaper" first on Android 12+, with no swatch (see `AccentOption`), then the brand accents. */
export const ACCENT_OPTIONS: readonly AccentOption[] = materialAccentOptions(isDynamicColorAvailable);

export const DEFAULT_ACCENT_VALUE: number = defaultMaterialAccentValue(isDynamicColorAvailable);
