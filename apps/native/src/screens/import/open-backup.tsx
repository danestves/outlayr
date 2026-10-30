import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { View } from "react-native";

import { BusyText } from "@/components/busy-text";
import { SettingsScreen } from "@/components/settings/settings-screen";
import { useDatabase } from "@/contexts/local-data-context";
import { useTranslation } from "@/i18n/context";
import { moneyManagerSession } from "@/lib/money-manager-session";
import { notifyFailure } from "@/lib/notify";
import { SILENT } from "@/state/atom-command";
import { loadMoneyManagerBackupCommand } from "@/state/money-manager-commands";
import { useAtomAction } from "@/state/use-atom-action";
import { useColors } from "@/theme/use-colors";

import { useImportPaths } from "./paths";

/** Where "Open in Outlayr" lands: it reads the handed-over file, then steps aside for the overview. */
export function MoneyManagerOpenBackup() {
    const db = useDatabase();
    const router = useRouter();
    const t = useTranslation();
    const colors = useColors();
    const { paths } = useImportPaths();
    const load = useAtomAction(
        loadMoneyManagerBackupCommand,
        {
            onFailure: () => {
                notifyFailure({ body: t("alerts.transfer.unreadableFile"), title: t("mmImport.wrongFile.eyebrow") });
                router.replace(paths.intro);
            },
            onSuccess: (outcome) => {
                router.replace(outcome.kind === "ready" ? paths.overview : paths.wrongFile);
            },
        },
        SILENT
    );

    const started = useRef(false);

    // oxlint-disable-next-line outlayr/react-effect-budget -- reads the backup the native intent handed over, once per arrival
    useEffect(() => {
        // takePending empties the slot, so a second run would bounce a good backup to the intro.
        if (started.current) {
            return;
        }
        started.current = true;
        const source = moneyManagerSession.takePending();
        if (source === null) {
            router.replace(paths.intro);
            return;
        }
        load({ db, source });
    }, [db, load, paths.intro, router]);

    return (
        <SettingsScreen>
            <View className="items-center pt-24">
                <BusyText className="text-body" color={colors.muted}>
                    {t("mmImport.intro.reading")}
                </BusyText>
            </View>
        </SettingsScreen>
    );
}
