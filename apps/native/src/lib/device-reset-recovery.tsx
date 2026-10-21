import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { useLocalData } from "@/contexts/local-data-context";
import { closeDatabase } from "@/db/client";
import type { Database } from "@/db/client";
import { useTranslation } from "@/i18n/context";

import { resumePersistedCloudDeletion } from "./deletion-resume";
import { createDeviceResetGate } from "./device-data-reset";

async function recoverDevice(db: Database | null, retry: () => void): Promise<Error | null> {
    try {
        if (db === null) {
            throw new Error("Local database is unavailable for device reset");
        }
        const database = db;
        // Set only when the sweep reached the sqlite store: reopening after an ordinary launch publishes
        // `status: "opening"`, which un-gates this in `_layout`, remounts it and loops forever.
        let closed = false;
        const result = await createDeviceResetGate({
            // Close only: `retry()` here starts a reopen racing `deleteDatabaseAsync`, so the delete loses to a
            // locked file or a ledger is re-seeded mid-erase. `settings/account` closes the same way.
            closeDatabase: async () => {
                closed = true;
                await closeDatabase(database);
            },
            completeCloudDeletion: async () => {
                await resumePersistedCloudDeletion({ clearOnComplete: false, required: true });
            },
        }).recover();
        if (result.failures.length > 0) {
            throw new Error(`Device cleanup incomplete: ${result.failures.join(", ")}`);
        }
        if (closed) {
            retry();
        }
        return null;
    } catch (cause) {
        return cause instanceof Error ? cause : new Error(String(cause));
    }
}

export function DeviceResetRecovery({ children }: { children: ReactNode }) {
    const { db, retry } = useLocalData();
    const t = useTranslation();
    const [error, setError] = useState<Error | null>(null);
    const [ready, setReady] = useState(false);

    const recover = useCallback(() => {
        recoverDevice(db, retry).then((failure) => {
            if (failure === null) {
                setReady(true);
            } else {
                setError(failure);
            }
        });
    }, [db, retry]);

    useEffect(() => {
        recover();
    }, [recover]);

    const retryRecovery = () => {
        setError(null);
        recover();
    };

    if (error) {
        return (
            <View className="bg-background flex-1 items-center justify-center px-8">
                <Text className="font-sans-semibold text-foreground text-title pb-2">
                    {t("settings.account.resetFailedTitle")}
                </Text>
                <Text className="text-muted text-subtitle pb-4 text-center">{error.message}</Text>
                <Pressable
                    accessibilityRole="button"
                    className="bg-accent rounded-full px-6 py-3"
                    onPress={retryRecovery}
                >
                    <Text className="font-sans-semibold text-accent-foreground text-subtitle">{t("common.retry")}</Text>
                </Pressable>
            </View>
        );
    }

    return ready ? children : null;
}
