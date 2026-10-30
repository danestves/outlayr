import File01Icon from "@hugeicons-pro/core-stroke-rounded/File01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Linking, Pressable, View } from "react-native";

import { MonoLabel } from "@/components/mono-label";
import { SettingsAction } from "@/components/settings/settings-action";
import { SettingsScreen } from "@/components/settings/settings-screen";
import { Text } from "@/components/text";
import { useDatabase } from "@/contexts/local-data-context";
import type { MmArchiveError } from "@/domain/money-manager/types";
import type { TranslationKey } from "@/i18n/catalog";
import { useTranslation } from "@/i18n/context";
import { expectHandoff } from "@/lib/app-handoff";
import { useMoneyManagerSession } from "@/lib/money-manager-session";
import { notifyFailure } from "@/lib/notify";
import { supportMailURL } from "@/lib/support-link";
import { SILENT } from "@/state/atom-command";
import { loadMoneyManagerBackupCommand } from "@/state/money-manager-commands";
import { useAtomAction } from "@/state/use-atom-action";
import { useColors } from "@/theme/use-colors";

import { useImportPaths } from "./paths";

const COPY = {
    damaged: ["mmImport.wrongFile.damaged", "mmImport.wrongFile.damagedBody"],
    newer: ["mmImport.wrongFile.newer", "mmImport.wrongFile.newerBody"],
    notBackup: ["mmImport.wrongFile.notBackup", "mmImport.wrongFile.notBackupBody"],
    realbyte: ["mmImport.wrongFile.realbyte", "mmImport.wrongFile.realbyteBody"],
} as const satisfies Record<MmArchiveError["kind"], readonly [TranslationKey, TranslationKey]>;

export function MoneyManagerWrongFile() {
    const db = useDatabase();
    const router = useRouter();
    const t = useTranslation();
    const colors = useColors();
    const { paths } = useImportPaths();
    const { failure } = useMoneyManagerSession();
    const [busy, setBusy] = useState(false);
    const load = useAtomAction(
        loadMoneyManagerBackupCommand,
        {
            onFailure: () =>
                notifyFailure({ body: t("alerts.transfer.unreadableFile"), title: t("mmImport.wrongFile.eyebrow") }),
            onSettled: () => setBusy(false),
            onSuccess: (outcome) => {
                if (outcome.kind === "ready") {
                    router.replace(paths.overview);
                }
            },
        },
        SILENT
    );
    const kind = failure?.error.kind ?? "notBackup";
    const [titleKey, bodyKey] = COPY[kind];

    return (
        <SettingsScreen>
            <View className="gap-2 pt-8">
                <MonoLabel className="text-tint">{t("mmImport.wrongFile.eyebrow")}</MonoLabel>
                <Text className="font-sans-bold text-foreground text-title leading-tight tracking-tight">
                    {t(titleKey)}
                </Text>
                <Text className="text-muted text-body pt-1 leading-snug">{t(bodyKey)}</Text>
            </View>
            {failure ? (
                <View className="border-border mt-6 flex-row items-center gap-2.5 border-y py-3.5">
                    <HugeiconsIcon color={colors.muted} icon={File01Icon} size={18} strokeWidth={1.9} />
                    <Text className="text-footnote text-foreground flex-1 font-mono" numberOfLines={1}>
                        {failure.fileName}
                    </Text>
                </View>
            ) : null}
            <View className="gap-1 pt-10">
                <SettingsAction
                    busy={busy}
                    busyLabel={t("mmImport.intro.reading")}
                    disabled={busy}
                    label={t("import.chooseDifferentFile")}
                    onPress={() => {
                        setBusy(true);
                        load({ db, source: null });
                    }}
                />
                {kind === "realbyte" ? (
                    <Pressable
                        accessibilityRole="link"
                        className="h-12 items-center justify-center active:opacity-60"
                        onPress={() => {
                            expectHandoff();
                            Linking.openURL(supportMailURL(t("mmImport.sources.requestSubject")));
                        }}
                    >
                        <Text className="text-foreground text-callout font-sans-semibold">
                            {t("mmImport.wrongFile.tellUs")}
                        </Text>
                    </Pressable>
                ) : null}
            </View>
        </SettingsScreen>
    );
}
