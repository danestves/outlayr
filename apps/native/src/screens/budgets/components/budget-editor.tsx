import { BUDGET_TYPE, periodEnd, startOfPeriod } from "@outlayr/money/budget-window";
import { useMemo, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import Animated from "react-native-reanimated";

import { MonoLabel } from "@/components/mono-label";
import { revealEntering } from "@/components/sentence/sentence-motion";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import { budgetPeriodName, budgetWindowLabel } from "@/domain/budget-math";
import { formatAmount } from "@/domain/money";
import { useLanguage, useTranslation } from "@/i18n/context";
import { useHaptics } from "@/lib/use-haptics";

import { CompactDatePicker } from "./compact-date-picker";
import { EditorRow } from "./editor-row";
import { EditorSwitch } from "./editor-switch";

export interface BudgetEdit {
    amount?: number;
    name?: string | null;
    rollover?: boolean;
    startDate?: Date;
    type?: number;
}

interface BudgetEditorProps {
    calendar: { firstDayOfMonth: number; firstWeekday: number };
    /** Signed, and already in the display currency. */
    carry: number;
    currency: string;
    foreignCurrency?: string | null;
    /** The limit plus whatever carried in. */
    amount: number;
    limit: number;
    nowMs: number;
    name: string | null;
    namePlaceholder: string;
    onChange: (edit: BudgetEdit) => void;
    onChangeLimit: () => void;
    rollover: boolean;
    startDate: Date;
    type: number;
}

const PERIODS = [BUDGET_TYPE.day, BUDGET_TYPE.week, BUDGET_TYPE.month, BUDGET_TYPE.year] as const;

export function BudgetEditor({
    amount,
    limit,
    calendar,
    carry,
    nowMs,
    currency,
    foreignCurrency,
    name,
    namePlaceholder,
    rollover,
    startDate,
    type,
    onChange,
    onChangeLimit,
}: BudgetEditorProps) {
    const t = useTranslation();
    const { language } = useLanguage();
    const haptics = useHaptics();
    const { showCents } = useDisplaySettings().state;
    const [pickingPeriod, setPickingPeriod] = useState(false);
    const [pickingDate, setPickingDate] = useState(false);
    const [naming, setNaming] = useState(false);

    const money = (value: number) => formatAmount(value, currency, showCents, language);
    const carryNote =
        carry === 0 ? null : t("budgets.editor.limitCarry", { amount: money(amount), carry: money(carry) });

    const commitName = (next: string) => {
        setNaming(false);
        if (next.trim() !== (name ?? "").trim()) {
            onChange({ name: next });
        }
    };

    const changePeriod = (next: number) => {
        haptics("selection");
        if (next !== type) {
            onChange({ type: next });
        }
    };

    // Capped at today: the window rolls forward from the anchor, so a future date would ignore spend until then.
    // An older anchor stays selectable so an edit elsewhere does not silently move it.
    const anchorRange = useMemo(() => {
        const now = new Date(nowMs);
        const periodStart = startOfPeriod(now, type, calendar);
        return { end: now, start: startDate.getTime() < periodStart.getTime() ? startDate : periodStart };
    }, [nowMs, type, calendar, startDate]);

    const preview = (next: number) => {
        const start = startOfPeriod(new Date(nowMs), next, calendar);
        return budgetWindowLabel({ end: periodEnd(start, next), start }, next, language);
    };

    return (
        <View className="pt-7">
            <MonoLabel>{t("budgets.editor.title")}</MonoLabel>
            <View className="border-border mt-2 border-t">
                <EditorRow
                    detail={carryNote}
                    label={t("budgets.editor.limit")}
                    onPress={onChangeLimit}
                    value={money(limit)}
                />

                <EditorRow
                    label={t("budgets.editor.every")}
                    onPress={() => setPickingPeriod((open) => !open)}
                    value={t(budgetPeriodName(type))}
                />
                {pickingPeriod ? (
                    <Animated.View className="border-border gap-3 border-b pb-4" entering={revealEntering()}>
                        <View className="flex-row flex-wrap gap-2">
                            {PERIODS.map((period) => (
                                <Pressable
                                    accessibilityRole="button"
                                    accessibilityState={{ selected: period === type }}
                                    className={cn(
                                        "h-[38px] items-center justify-center rounded-[19px] border px-3.5",
                                        period === type ? "border-tint bg-tint/10" : "border-border"
                                    )}
                                    key={period}
                                    onPress={() => changePeriod(period)}
                                >
                                    <Text
                                        className={cn(
                                            "text-subtitle",
                                            period === type ? "text-tint" : "text-foreground"
                                        )}
                                    >
                                        {t(budgetPeriodName(period))}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                        <Text className="text-footnote text-muted leading-snug">
                            {t("budgets.editor.reslice", { window: preview(type) })}
                        </Text>
                    </Animated.View>
                ) : null}

                <EditorRow
                    label={t("budgets.editor.from")}
                    onPress={() => setPickingDate((open) => !open)}
                    value={budgetWindowLabel({ end: startDate, start: startDate }, BUDGET_TYPE.day, language)}
                />
                {pickingDate ? (
                    <Animated.View className="border-border border-b py-2" entering={revealEntering()}>
                        <CompactDatePicker
                            label={t("budgets.editor.from")}
                            onChange={(next) => {
                                setPickingDate(false);
                                onChange({ startDate: next });
                            }}
                            onDismiss={() => setPickingDate(false)}
                            range={anchorRange}
                            value={startDate}
                        />
                    </Animated.View>
                ) : null}

                <View className="border-border border-b py-3.5">
                    <View className="flex-row items-center gap-3">
                        <Text className="text-body text-foreground flex-1">{t("budgets.editor.carry")}</Text>
                        <EditorSwitch
                            accessibilityLabel={t("budgets.editor.carry")}
                            onValueChange={(next) => onChange({ rollover: next })}
                            value={rollover}
                        />
                    </View>
                    <Text className="text-muted text-subtitle pt-1 leading-snug">
                        {rollover && carry !== 0
                            ? t("budgets.editor.dropCarry", { carry: money(carry) })
                            : t("budgets.editor.carryNote")}
                    </Text>
                </View>

                {naming ? (
                    <Animated.View className="border-border border-b py-2.5" entering={revealEntering()}>
                        <TextInput
                            autoCapitalize="words"
                            autoFocus
                            className="text-body text-foreground py-1 font-sans"
                            defaultValue={name ?? ""}
                            // Fires on Done and on blur, so a name abandoned by tapping the next row still commits.
                            onEndEditing={(event) => commitName(event.nativeEvent.text)}
                            placeholder={namePlaceholder}
                            placeholderTextColorClassName="accent-muted"
                            returnKeyType="done"
                        />
                        <Text className="text-muted text-subtitle pt-1 leading-snug">
                            {t("budgets.editor.nameNote")}
                        </Text>
                    </Animated.View>
                ) : (
                    <EditorRow
                        label={t("budgets.editor.name")}
                        onPress={() => setNaming(true)}
                        value={name?.trim() ? name : namePlaceholder}
                    />
                )}
            </View>

            {foreignCurrency ? (
                <Text className="text-muted text-subtitle pt-2 leading-snug">
                    {t("budgets.editor.currency", { from: foreignCurrency, to: currency })}
                </Text>
            ) : null}
        </View>
    );
}
