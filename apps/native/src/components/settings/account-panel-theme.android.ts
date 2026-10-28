import { useMaterialColors } from "@/theme/use-material-colors";

export const panelClasses = {
    avatar: "bg-m3-primary",
    avatarOutline: "border-m3-outline-variant",
    avatarText: "text-m3-on-primary",
    border: "border-m3-outline-variant",
    dotOff: "bg-m3-outline",
    dotOn: "bg-income",
    foreground: "text-m3-on-surface",
    link: "text-m3-primary",
    muted: "text-m3-on-surface-variant",
    pill: "bg-m3-primary",
    pillText: "text-m3-on-primary",
    progress: "bg-m3-primary",
} as const;

export function usePanelIcons() {
    const m3 = useMaterialColors();
    return { avatar: m3.onPrimary, chevron: m3.onSurfaceVariant, link: m3.primary, outline: m3.onSurfaceVariant };
}
