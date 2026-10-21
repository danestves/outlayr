import { View } from "react-native";

import { useDisplaySettings } from "@/contexts/display-settings-context";
import { formatDayHeader } from "@/domain/dates";
import type { DaySection } from "@/domain/day-sections";
import { useAccessibilityTextSize } from "@/hooks/use-accessibility-text-size";
import { useLanguage, useTranslation } from "@/i18n/context";

import { ActionMenu } from "./action-menu";
import { DayTotal } from "./amount-text";
import { MonoLabel } from "./mono-label";
import { cn } from "./tw";

interface DaySectionHeaderProps {
    first?: boolean;
    onShare?: () => void;
    section: DaySection<unknown>;
}

export function DaySectionHeader({ section, first = false, onShare }: DaySectionHeaderProps) {
    const { showCents } = useDisplaySettings().state;
    // Consuming the language re-renders this on a change; `formatDayHeader`'s default is invisible to React.
    const { language } = useLanguage();
    const t = useTranslation();
    const largeText = useAccessibilityTextSize();
    const body = (
        <>
            <View className={cn("flex-row items-baseline justify-between gap-2", largeText && "flex-wrap")}>
                <MonoLabel>{formatDayHeader(section.day, undefined, language)}</MonoLabel>
                <DayTotal showCents={showCents} totals={section.totals} />
            </View>
            {/* A 1.3 stroke with round caps, not a 1px border. */}
            <View className="bg-border" style={{ borderRadius: 0.65, height: 1.3 }} />
        </>
    );
    const className = first ? "gap-1.25 pt-2.5" : "gap-1.25 pt-7";

    if (!onShare) {
        return <View className={className}>{body}</View>;
    }

    return (
        <ActionMenu
            items={[
                {
                    icon: "square.and.arrow.up",
                    id: "share",
                    label: t("alerts.dayCard.share"),
                    onPress: onShare,
                },
            ]}
            owner={String(section.day.getTime())}
        >
            {/* The menu snapshots this view for its preview, so it carries the group's ground. */}
            <View className={cn("bg-background", className)}>{body}</View>
        </ActionMenu>
    );
}
