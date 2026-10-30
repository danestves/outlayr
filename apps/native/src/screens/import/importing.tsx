import Tick02Icon from "@hugeicons-pro/core-stroke-rounded/Tick02Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useRouter } from "expo-router";
import { Progress } from "panelui-native/components/progress";
import { View } from "react-native";

import { ImportHero } from "@/components/import-flow/parts";
import { SettingsAction } from "@/components/settings/settings-action";
import { SettingsScreen } from "@/components/settings/settings-screen";
import { Text } from "@/components/text";
import { cn } from "@/components/tw";
import type { TranslationKey } from "@/i18n/catalog";
import { useTranslation } from "@/i18n/context";
import { useMoneyManagerSession } from "@/lib/money-manager-session";
import { useColors } from "@/theme/use-colors";

import { grouped, tc } from "./labels";
import { useHardwareBack } from "./use-hardware-back";

type Stage = "done" | "now" | "next";

const SETUP_STAGES = [
    "accounts.title",
    "nav.categories",
    "mmImport.nav.budgets",
] as const satisfies readonly TranslationKey[];

export function MoneyManagerImporting() {
    const { failed, progress, result } = useMoneyManagerSession();
    const router = useRouter();
    const t = useTranslation();
    const colors = useColors();
    const done = progress?.done ?? 0;
    const total = progress?.total ?? 0;
    const writing = done > 0 || result !== null;
    useHardwareBack(() => {
        if (failed) {
            router.back();
        }
    });

    if (failed) {
        return (
            <SettingsScreen>
                <View className="gap-2 pt-10">
                    <Text className="font-sans-bold text-foreground text-title">
                        {t("mmImport.importing.failedTitle")}
                    </Text>
                    <Text className="text-muted text-subtitle">{t("mmImport.importing.failedBody")}</Text>
                </View>
                <View className="pt-10">
                    <SettingsAction
                        busy={false}
                        busyLabel=""
                        disabled={false}
                        label={t("common.retry")}
                        onPress={() => router.back()}
                    />
                </View>
            </SettingsScreen>
        );
    }

    const stages: [string, Stage][] = [
        ...SETUP_STAGES.map((key): [string, Stage] => [t(key), writing ? "done" : "now"]),
        [
            tc(t, "mmImport.count.entries", total, { shown: `${grouped(done)} / ${grouped(total)}` }),
            writing ? "now" : "next",
        ],
        [t("mmImport.importing.balanceCheck"), result === null ? "next" : "now"],
    ];

    return (
        <SettingsScreen footer={t("mmImport.importing.keepOpen")}>
            <ImportHero
                caption={t("mmImport.importing.of", { total: grouped(total) })}
                eyebrow={t("mmImport.importing.eyebrow")}
                value={grouped(done)}
            />
            <View className="pt-5">
                <Progress maxValue={Math.max(total, 1)} size="sm" value={done} />
            </View>
            <View className="pt-6">
                {stages.map(([label, stage]) => (
                    <View className="border-border flex-row items-center gap-3 border-b py-3.5" key={label}>
                        <View className="h-5 w-5 items-center justify-center">
                            {stage === "done" ? (
                                <HugeiconsIcon color={colors.income} icon={Tick02Icon} size={18} strokeWidth={2.4} />
                            ) : (
                                <View
                                    className={cn(
                                        "rounded-full",
                                        stage === "now" ? "bg-tint h-2 w-2" : "border-border h-3.5 w-3.5 border-[1.5px]"
                                    )}
                                />
                            )}
                        </View>
                        <Text
                            className={cn(
                                "text-body flex-1",
                                stage === "next" ? "text-muted" : "text-foreground",
                                stage === "now" && "font-sans-semibold"
                            )}
                        >
                            {label}
                        </Text>
                    </View>
                ))}
            </View>
        </SettingsScreen>
    );
}
