import type { AppIconControl, useAppIcon as iosUseAppIcon } from "@/lib/app-icon";

export type { AppIconControl } from "@/lib/app-icon";

/**
 * expo-alternate-app-icons reports support on Android, but the app ships no activity aliases (the icon plugin is
 * iOS-only), so every change would fail.
 */
export const alternateIconsSupported = false;

const PRIMARY: AppIconControl = { active: null, choose: () => undefined };

export const useAppIcon: typeof iosUseAppIcon = () => PRIMARY;
