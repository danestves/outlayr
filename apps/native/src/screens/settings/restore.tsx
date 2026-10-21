import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, View } from "react-native";

import { MonoLabel } from "@/components/mono-label";
import { SettingsAction } from "@/components/settings/settings-action";
import { SettingsScreen } from "@/components/settings/settings-screen";
import { Text } from "@/components/text";
import { useDatabase } from "@/contexts/local-data-context";
import { restoreArchive } from "@/data/archive-core";
import { reconcilePhotos } from "@/data/photo-store-core";
import { archiveRowCount, parseArchive } from "@/domain/archive";
import type { ArchiveDocument } from "@/domain/archive";
import { useTranslation } from "@/i18n/context";
import { pickArchiveFile, TransferError } from "@/lib/data-transfer";
import { armLogoBackfill, cancelLogoBackfill } from "@/lib/logo-backfill";
import { notifyFailure } from "@/lib/notify";
import { photoFiles, writePhotosBase64 } from "@/lib/photo-storage";

export function RestoreData() {
    const db = useDatabase();
    const router = useRouter();
    const t = useTranslation();
    const [restoring, setRestoring] = useState<number | null>(null);

    // Stop the logo pass first: it could paint a row the archive replaced.
    const applyArchive = (document: ArchiveDocument) => {
        setRestoring(archiveRowCount(document));
        cancelLogoBackfill()
            .then(() => {
                writePhotosBase64(document.photos);
                return restoreArchive(db, document);
            })
            .then(() => reconcilePhotos(db, photoFiles, Date.now()))
            .finally(() => armLogoBackfill(db))
            .then(() => router.back())
            .catch(() => {
                notifyFailure({ body: t("settings.restore.failedBody"), title: t("settings.restore.failedTitle") });
            })
            .finally(() => setRestoring(null));
    };

    // A restore replaces the ledger, so it is confirmed against a recognisable row count.
    const restore = () => {
        pickArchiveFile()
            .then((picked) => {
                if (picked == null) {
                    return;
                }
                const document = parseArchive(picked.text);
                if (document == null) {
                    notifyFailure({
                        body: t("settings.restore.badArchiveBody"),
                        title: t("settings.restore.badArchiveTitle"),
                    });
                    return;
                }
                Alert.alert(
                    t("settings.restore.confirmTitle"),
                    t("settings.restore.confirmBody", {
                        count: archiveRowCount(document),
                    }),
                    [
                        { style: "cancel", text: t("common.cancel") },
                        {
                            onPress: () => applyArchive(document),
                            style: "destructive",
                            text: t("settings.restore.confirmAction"),
                        },
                    ]
                );
            })
            .catch((cause: unknown) => {
                notifyFailure({
                    body: cause instanceof TransferError ? t(cause.key) : t("settings.restore.failedBody"),
                    title: t("settings.restore.failedTitle"),
                });
            });
    };

    return (
        <SettingsScreen footer={t("settings.restore.footer")}>
            <View className="gap-1 pt-6">
                <MonoLabel>{t("settings.restore.eyebrow")}</MonoLabel>
                <Text className="text-muted text-subtitle pb-4 leading-snug">{t("settings.restore.intro")}</Text>
            </View>

            <View className="pt-2">
                <SettingsAction
                    busy={restoring !== null}
                    busyLabel={t("settings.restore.restoring", { count: restoring ?? 0 })}
                    disabled={restoring !== null}
                    label={t("settings.restore.action")}
                    onPress={restore}
                />
            </View>
        </SettingsScreen>
    );
}
