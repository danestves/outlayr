import Tick02Icon from "@hugeicons-pro/core-stroke-rounded/Tick02Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, View } from "react-native";

import { CategoryIconTile } from "@/components/category-icon-tile";
import { ImportRow } from "@/components/import-flow/import-row";
import { ImportHero } from "@/components/import-flow/parts";
import { SettingsSection } from "@/components/list/list-row";
import { SettingsAction } from "@/components/settings/settings-action";
import { SettingsScreen } from "@/components/settings/settings-screen";
import { Text } from "@/components/text";
import { useDatabase } from "@/contexts/local-data-context";
import { flyleafDate } from "@/domain/flyleaf";
import type { MmBalanceCheck } from "@/domain/money-manager/types";
import { useLanguage, useTranslation } from "@/i18n/context";
import { moneyManagerSession, useMoneyManagerSession } from "@/lib/money-manager-session";
import { notifyFailure } from "@/lib/notify";
import { SILENT } from "@/state/atom-command";
import { undoMoneyManagerImportCommand } from "@/state/money-manager-commands";
import { useAtomAction } from "@/state/use-atom-action";
import { useColors } from "@/theme/use-colors";

import { money, tc } from "./labels";
import { useImportPaths } from "./paths";
import { useHardwareBack } from "./use-hardware-back";

const CHECKS_SHOWN = 5;

/** Mismatches first: those are the rows the person has to look at. */
function ordered(checks: readonly MmBalanceCheck[]): MmBalanceCheck[] {
    return [...checks].sort(
        (a, b) => Number(a.matches) - Number(b.matches) || Math.abs(b.balance) - Math.abs(a.balance)
    );
}

export function MoneyManagerDone() {
    const db = useDatabase();
    const router = useRouter();
    const t = useTranslation();
    const colors = useColors();
    const { language } = useLanguage();
    const { onboarding } = useImportPaths();
    const { result } = useMoneyManagerSession();
    const [undoing, setUndoing] = useState(false);
    const leave = () => {
        moneyManagerSession.reset();
        router.dismissAll();
        router.navigate(onboarding ? "/onboarding/auto-log" : "/");
    };
    useHardwareBack(leave);
    const undo = useAtomAction(
        undoMoneyManagerImportCommand,
        {
            onFailure: () => notifyFailure({ title: t("mmImport.undo.failed") }),
            onSettled: () => setUndoing(false),
            onSuccess: () => {
                moneyManagerSession.reset();
                router.dismissAll();
            },
        },
        SILENT
    );
    if (result === null) {
        return <SettingsScreen>{null}</SettingsScreen>;
    }
    const { checks, record } = result;
    const off = checks.filter((check) => !check.matches).length;
    const shown = ordered(checks).slice(0, CHECKS_SHOWN);
    const entries = record.transactionIds.length + record.transferIds.length;

    const confirmUndo = () => {
        Alert.alert(t("mmImport.undo.title"), t("mmImport.undo.body"), [
            { style: "cancel", text: t("common.cancel") },
            {
                onPress: () => {
                    setUndoing(true);
                    undo({ db });
                },
                style: "destructive",
                text: t("mmImport.undo.confirm"),
            },
        ]);
    };

    return (
        <SettingsScreen>
            <ImportHero
                caption={[
                    tc(t, "mmImport.count.accounts", Object.keys(record.accountKeys).length),
                    tc(t, "mmImport.count.categories", record.categoryIds.length),
                    tc(t, "mmImport.count.budgets", record.budgetIds.length),
                ].join(", ")}
                eyebrow={t("mmImport.done.eyebrow", { date: flyleafDate(new Date(record.importedAt), language) })}
                eyebrowTone="tint"
                value={tc(t, "mmImport.count.entries", entries)}
            />
            {checks.length > 0 ? (
                <SettingsSection
                    title={
                        off === 0
                            ? tc(t, "mmImport.done.allMatch", checks.length)
                            : t("mmImport.done.someOff", { shown: String(off) })
                    }
                >
                    {shown.map((check) => (
                        <ImportRow
                            detail={checkDetail(check, t)}
                            key={check.accountId}
                            leading={
                                <CategoryIconTile
                                    color={check.color ?? colors.foreground}
                                    icon={check.icon}
                                    size={32}
                                />
                            }
                            title={check.name}
                            value={money(check.balance, check.currency)}
                        />
                    ))}
                    {checks.length > CHECKS_SHOWN ? (
                        <View className="border-border flex-row items-center gap-2 border-b py-3">
                            <HugeiconsIcon color={colors.income} icon={Tick02Icon} size={16} strokeWidth={2.4} />
                            <Text className="text-muted text-subtitle">
                                {tc(t, "mmImport.done.more", checks.length - CHECKS_SHOWN)}
                            </Text>
                        </View>
                    ) : null}
                </SettingsSection>
            ) : null}
            <View className="gap-2 pt-10">
                <SettingsAction
                    busy={false}
                    busyLabel=""
                    disabled={undoing}
                    label={onboarding ? t("common.continue") : t("mmImport.done.openLog")}
                    onPress={leave}
                />
                <Pressable
                    accessibilityRole="button"
                    className="h-12 items-center justify-center active:opacity-60"
                    disabled={undoing}
                    onPress={confirmUndo}
                    testID="mm-undo"
                >
                    <Text className="text-danger text-callout font-sans-semibold">{t("mmImport.undo.action")}</Text>
                </Pressable>
            </View>
        </SettingsScreen>
    );
}

function checkDetail(check: MmBalanceCheck, t: ReturnType<typeof useTranslation>): string {
    if (!check.matches) {
        return t("mmImport.done.shows", { amount: money(check.expected, check.currency) });
    }
    return t(check.adjusted ? "mmImport.done.adjusted" : "mmImport.done.matches");
}
