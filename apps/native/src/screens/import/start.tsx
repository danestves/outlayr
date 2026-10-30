import { View } from "react-native";

import { ChoiceRow, SettingsSection } from "@/components/list/list-row";
import { MonoLabel } from "@/components/mono-label";
import { SettingsScreen } from "@/components/settings/settings-screen";
import { Text } from "@/components/text";
import { formatTargetDate, monthAbbrev } from "@/domain/dates";
import type { MmOverlap, StartChoice } from "@/domain/money-manager/types";
import { useTranslation } from "@/i18n/context";
import { moneyManagerSession, useMoneyManagerSession } from "@/lib/money-manager-session";

import { grouped } from "./labels";

const DAY_MS = 86_400_000;
const AXIS_MONTHS = 3;

function dayDate(day: string): Date {
    return new Date(`${day}T12:00:00`);
}

/** The last three months only: three years of Money Manager would squeeze the overlap to a sliver. */
function Timeline({ lastDay, overlap }: { lastDay: string; overlap: MmOverlap }) {
    const end = dayDate(lastDay);
    const axisStart = new Date(end.getFullYear(), end.getMonth() - (AXIS_MONTHS - 1), 1, 12);
    const axisEnd = new Date(end.getFullYear(), end.getMonth() + 1, 1, 12);
    const span = axisEnd.getTime() - axisStart.getTime();
    const at = (date: Date) => Math.min(1, Math.max(0, (date.getTime() - axisStart.getTime()) / span));
    const overlapFrom = at(dayDate(overlap.outlayrFirstDay));
    const lastAt = at(new Date(end.getTime() + DAY_MS));
    const months = Array.from(
        { length: AXIS_MONTHS + 1 },
        (_, index) => new Date(axisStart.getFullYear(), axisStart.getMonth() + index, 1, 12)
    );

    return (
        <View className="gap-2 pt-4" importantForAccessibility="no-hide-descendants">
            <View className="relative h-24">
                <View
                    className="bg-tint/15 absolute top-0 bottom-0 rounded"
                    style={{ left: `${overlapFrom * 100}%`, width: `${(lastAt - overlapFrom) * 100}%` }}
                />
                <MonoLabel className="pt-1">MONEY MANAGER</MonoLabel>
                <View className="bg-foreground mt-1.5 h-2.5 rounded-full" style={{ width: `${lastAt * 100}%` }} />
                <MonoLabel className="pt-3">OUTLAYR</MonoLabel>
                <View
                    className="bg-tint mt-1.5 h-2.5 rounded-full"
                    style={{ marginLeft: `${overlapFrom * 100}%`, width: `${(lastAt - overlapFrom) * 100}%` }}
                />
            </View>
            <View className="flex-row justify-between">
                {months.map((month) => (
                    <MonoLabel key={month.getTime()}>{monthAbbrev(month)}</MonoLabel>
                ))}
            </View>
        </View>
    );
}

export function MoneyManagerStart() {
    const { draft } = useMoneyManagerSession();
    const t = useTranslation();
    const overlap = draft?.analysis.overlap ?? null;
    if (draft === null || overlap === null || draft.analysis.lastDay === null) {
        return <SettingsScreen>{null}</SettingsScreen>;
    }
    const day = formatTargetDate(dayDate(overlap.outlayrFirstDay));
    const options: { detail: string; label: string; value: StartChoice["kind"] }[] = [
        { detail: t("mmImport.start.cutoffDetail"), label: t("mmImport.start.cutoff", { day }), value: "cutoff" },
        {
            detail: t("mmImport.start.skipMatchesDetail", { shown: grouped(overlap.matches) }),
            label: t("mmImport.start.skipMatches"),
            value: "skipMatches",
        },
        { detail: t("mmImport.start.allDetail"), label: t("mmImport.start.all"), value: "all" },
    ];

    return (
        <SettingsScreen>
            <View className="pt-6">
                <MonoLabel>{t("mmImport.start.eyebrow", { day })}</MonoLabel>
                <Timeline lastDay={draft.analysis.lastDay} overlap={overlap} />
                <Text className="text-body font-sans-medium text-foreground pt-4 leading-snug">
                    {t("mmImport.start.summary", {
                        mm: grouped(overlap.mmEntries),
                        outlayr: grouped(overlap.outlayrEntries),
                    })}
                </Text>
            </View>
            <SettingsSection>
                {options.map((option) => (
                    <ChoiceRow
                        detail={option.detail}
                        key={option.value}
                        label={option.label}
                        onPress={() =>
                            moneyManagerSession.updateChoices((choices) => ({
                                ...choices,
                                start: { kind: option.value },
                            }))
                        }
                        selected={draft.choices.start.kind === option.value}
                    />
                ))}
            </SettingsSection>
        </SettingsScreen>
    );
}
