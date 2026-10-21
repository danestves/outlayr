import { ACCENTS, DEFAULT_ACCENT } from "./accent";
import type { AccentOption } from "./material-accent";

/** iOS offers the brand accents alone; `accent-options.android.ts` adds Wallpaper on Android 12+. */
export const ACCENT_OPTIONS: readonly AccentOption[] = ACCENTS;

export const DEFAULT_ACCENT_VALUE: number = DEFAULT_ACCENT.value;
