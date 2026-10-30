import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { MoneyManagerTile } from "@/components/import-flow/parts";
import { SettingsAction } from "@/components/settings/settings-action";
import { SettingsScreen } from "@/components/settings/settings-screen";
import { Text } from "@/components/text";
import { useDatabase } from "@/contexts/local-data-context";
import type { TranslationKey } from "@/i18n/catalog";
import { useTranslation } from "@/i18n/context";
import { notifyFailure } from "@/lib/notify";
import { SILENT } from "@/state/atom-command";
import { loadMoneyManagerBackupCommand } from "@/state/money-manager-commands";
import { useAtomAction } from "@/state/use-atom-action";

import { useImportPaths } from "./paths";

const STEPS = [
    ["01", "mmImport.intro.step1"],
    ["02", "mmImport.intro.step2"],
    ["03", "mmImport.intro.step3"],
] as const satisfies readonly (readonly [string, TranslationKey])[];

export function MoneyManagerIntro() {
    const db = useDatabase();
    const router = useRouter();
    const t = useTranslation();
    const { paths } = useImportPaths();
    const [busy, setBusy] = useState(false);
    const load = useAtomAction(
        loadMoneyManagerBackupCommand,
        {
            onFailure: () =>
                notifyFailure({ body: t("alerts.transfer.unreadableFile"), title: t("mmImport.wrongFile.eyebrow") }),
            onSettled: () => setBusy(false),
            onSuccess: (outcome) => {
                if (outcome.kind === "ready") {
                    router.push(paths.overview);
                } else if (outcome.kind === "failed") {
                    router.push(paths.wrongFile);
                }
            },
        },
        SILENT
    );

    const choose = () => {
        setBusy(true);
        load({ db, source: null });
    };

    return (
        <SettingsScreen>
            <View className="flex-row items-center gap-3.5 pt-6">
                <MoneyManagerTile size={56} />
                <View className="flex-1 gap-0.5">
                    <Text className="font-sans-bold text-foreground text-title tracking-tight">
                        {t("mmImport.intro.title")}
                    </Text>
                    <Text className="text-muted text-subtitle">{t("mmImport.intro.detail")}</Text>
                </View>
            </View>
            <View className="border-border mt-6 border-b">
                {STEPS.map(([number, key]) => (
                    <View className="border-border flex-row items-start gap-4 border-t py-4" key={number}>
                        <Text className="text-tint text-subtitle pt-0.5 font-mono tracking-wide">{number}</Text>
                        <Text className="text-body font-sans-medium text-foreground flex-1 leading-snug">{t(key)}</Text>
                    </View>
                ))}
            </View>
            <Text className="text-muted text-footnote pt-3 font-mono">{t("mmImport.intro.fileHint")}</Text>
            <View className="pt-10">
                <SettingsAction
                    busy={busy}
                    busyLabel={t("mmImport.intro.reading")}
                    disabled={busy}
                    label={t("mmImport.intro.choose")}
                    onPress={choose}
                />
            </View>
        </SettingsScreen>
    );
}
