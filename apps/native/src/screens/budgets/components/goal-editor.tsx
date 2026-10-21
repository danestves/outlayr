import { useMemo, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import Animated from "react-native-reanimated";

import { MonoLabel } from "@/components/mono-label";
import { revealEntering } from "@/components/sentence/sentence-motion";
import { Text } from "@/components/text";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import { useNow } from "@/data/use-now";
import { formatTargetDate } from "@/domain/dates";
import { tomorrowLocal } from "@/domain/local-day";
import { formatAmount } from "@/domain/money";
import { useLanguage, useTranslation } from "@/i18n/context";

import { CompactDatePicker } from "./compact-date-picker";
import { EditorRow } from "./editor-row";

export interface GoalEdit {
    name?: string;
    targetAmount?: number;
    targetDate?: Date;
}

interface GoalEditorProps {
    accountName: string;
    currency: string;
    /** The currency `targetAmount` is actually in: the goal's own when unvalued. */
    targetCurrency: string;
    foreignCurrency?: string | null;
    perMonth: number | null;
    onChange: (edit: GoalEdit) => void;
    onChangeTarget: () => void;
    onDelete: () => void;
    name: string;
    targetAmount: number;
    targetDate: Date;
}

export function GoalEditor({
    accountName,
    currency,
    foreignCurrency,
    name,
    onChange,
    onChangeTarget,
    onDelete,
    perMonth,
    targetAmount,
    targetCurrency,
    targetDate,
}: GoalEditorProps) {
    const t = useTranslation();
    const { language } = useLanguage();
    const { showCents } = useDisplaySettings().state;
    const [pickingDate, setPickingDate] = useState(false);
    const [naming, setNaming] = useState(false);

    const money = (value: number) => formatAmount(value, currency, showCents, language);

    // Keyed on the shared clock: a screen left open across midnight would otherwise let a same-day deadline through.
    const nowMs = useNow();
    const range = useMemo(() => {
        const start = tomorrowLocal(nowMs);
        return { start: start < targetDate ? start : targetDate };
    }, [targetDate, nowMs]);

    const commitName = (next: string) => {
        setNaming(false);
        if (next.trim() && next.trim() !== name.trim()) {
            onChange({ name: next.trim() });
        }
    };

    return (
        <View className="pt-7">
            <MonoLabel>{t("goals.editor.title")}</MonoLabel>
            <View className="border-border mt-2 border-t">
                {naming ? (
                    <Animated.View className="border-border border-b py-2.5" entering={revealEntering()}>
                        <TextInput
                            autoCapitalize="words"
                            autoFocus
                            className="text-body text-foreground py-1 font-sans"
                            defaultValue={name}
                            // Fires on Done and on blur, so a name abandoned by tapping the next row still commits.
                            onEndEditing={(event) => commitName(event.nativeEvent.text)}
                            placeholder={t("goals.form.defaultName")}
                            placeholderTextColorClassName="accent-muted"
                            returnKeyType="done"
                        />
                    </Animated.View>
                ) : (
                    <EditorRow label={t("goals.editor.name")} onPress={() => setNaming(true)} value={name} />
                )}

                <EditorRow
                    detail={perMonth == null ? null : t("goals.editor.targetNote", { amount: money(perMonth) })}
                    label={t("goals.editor.target")}
                    onPress={onChangeTarget}
                    value={formatAmount(targetAmount, targetCurrency, showCents, language)}
                />

                <EditorRow
                    label={t("goals.editor.by")}
                    onPress={() => setPickingDate((open) => !open)}
                    value={formatTargetDate(targetDate, language)}
                />
                {pickingDate ? (
                    <Animated.View className="border-border border-b py-2" entering={revealEntering()}>
                        <CompactDatePicker
                            label={t("goals.editor.by")}
                            // Clamped, not merely bounded: an overdue goal lowers the range's floor so it can render.
                            onChange={(next) => {
                                setPickingDate(false);
                                const floor = tomorrowLocal(nowMs);
                                onChange({ targetDate: next < floor ? floor : next });
                            }}
                            onDismiss={() => setPickingDate(false)}
                            range={range}
                            value={targetDate}
                        />
                    </Animated.View>
                ) : null}

                <View className="border-border border-b py-3.5">
                    <View className="flex-row items-center gap-3">
                        <Text className="text-body text-foreground flex-1">{t("goals.editor.account")}</Text>
                        <Text className="text-body text-muted">{accountName}</Text>
                    </View>
                    <Text className="text-muted text-subtitle pt-1 leading-snug">{t("goals.editor.accountNote")}</Text>
                </View>

                <Pressable
                    accessibilityRole="button"
                    className="border-border border-b py-3.5 active:opacity-60"
                    onPress={onDelete}
                >
                    <Text className="text-over-budget text-body">{t("goals.editor.delete")}</Text>
                </Pressable>
            </View>

            {foreignCurrency ? (
                <Text className="text-muted text-subtitle pt-2 leading-snug">
                    {t("goals.editor.currency", { from: foreignCurrency, to: currency })}
                </Text>
            ) : null}
        </View>
    );
}
