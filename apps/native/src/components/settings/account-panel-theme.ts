import { useColors } from "@/theme/use-colors";

export const panelClasses = {
    avatar: "bg-accent",
    avatarOutline: "border-border",
    avatarText: "text-accent-foreground",
    border: "border-border",
    dotOff: "bg-subtle",
    dotOn: "bg-income",
    foreground: "text-foreground",
    link: "text-tint",
    muted: "text-muted",
    pill: "bg-accent",
    pillText: "text-accent-foreground",
    progress: "",
} as const;

export function usePanelIcons() {
    const colors = useColors();
    return { avatar: colors.accentForeground, chevron: colors.subtle, link: colors.tint, outline: colors.muted };
}
