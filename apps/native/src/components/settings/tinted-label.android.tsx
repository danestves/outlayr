import type { TintedLabel as IosTintedLabel } from "@/components/settings/tinted-label";

export type { TintedLabelProps } from "@/components/settings/tinted-label";

// Glow registers `TintedLabelView` only in Swift, and mounting an unregistered view is a fatal Fabric crash.
export const TintedLabel: typeof IosTintedLabel = () => null;

export const tintedLabelAvailable = false;
