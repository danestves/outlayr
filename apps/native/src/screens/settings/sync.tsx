import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { LinkRow, SettingsSection, ToggleRow } from "@/components/list/list-row";
import { MonoLabel } from "@/components/mono-label";
import { AccountRow } from "@/components/settings/account-row";
import { SettingsScreen } from "@/components/settings/settings-screen";
import { Text } from "@/components/text";
import { useDisplaySettings } from "@/contexts/display-settings-context";
import { useDatabase } from "@/contexts/local-data-context";
import { runAdoption } from "@/data/ledger-adoption";
import { setSyncEnabled } from "@/data/sync-outbox-core";
import { useSyncStatus } from "@/data/use-sync-status";
import { formatDayHeader, formatTime } from "@/domain/dates";
import type { AdoptionActions } from "@/domain/ledger-adoption";
import { effectiveCapabilityStatus, ownsSyncSwitch, syncPresentation, syncRunnable } from "@/domain/sync-status";
import { useProEntitled } from "@/hooks/use-pro-locked";
import { useLanguage, useTranslation } from "@/i18n/context";
import { adoptionEngine } from "@/lib/adoption-engine";
import { useAuthSession } from "@/lib/auth-session";
import { cloudRuntime } from "@/lib/cloud-runtime";
import { useLedgerAdoption } from "@/lib/ledger-adoption";
import { notifyFailure } from "@/lib/notify";

/** Resumes through adoption: `runAdoption` opens the gate before queueing, the order `enqueueAllForSync` needs. */
const RESUME: AdoptionActions = {
    pushLocal: true,
    wipeAccount: false,
    wipeLocal: false,
};

export function Sync() {
    const db = useDatabase();
    const t = useTranslation();
    const router = useRouter();
    const entitled = useProEntitled();
    const { language } = useLanguage();
    const { accountId } = useAuthSession();
    const { status } = useLedgerAdoption();
    const { enabled, pending, syncedAt } = useSyncStatus(db);
    const { use24Hour } = useDisplaySettings().state;
    const [busy, setBusy] = useState(false);

    const runnable = syncRunnable(enabled, entitled);
    const capability = effectiveCapabilityStatus({
        accountId,
        cloud: cloudRuntime === null ? "unconfigured" : "configured",
        local: false,
        pending,
        syncEnabled: runnable,
        syncedAt,
    });
    const owned = ownsSyncSwitch(capability.kind, status);
    const presentation = syncPresentation(capability.kind, enabled, entitled);

    const toggle = (next: boolean) => {
        if (next && !entitled) {
            router.push("/paywall");
            return;
        }
        setBusy(true);
        const work =
            next && accountId ? runAdoption(db, adoptionEngine(db), RESUME, accountId) : setSyncEnabled(db, false);
        work.catch((cause: unknown) => {
            console.error("Sync switch failed", cause);
            notifyFailure({ body: t("settings.sync.failedBody"), title: t("settings.sync.failedTitle") });
        }).finally(() => setBusy(false));
    };

    return (
        <SettingsScreen>
            <View className="gap-1.5 pt-6">
                <MonoLabel>{t("settings.sync.eyebrow")}</MonoLabel>
                <Text className="font-sans-semibold text-foreground text-title">{t(presentation.title)}</Text>
                <Text className="text-muted text-subtitle pt-1 leading-snug">{t(presentation.detail)}</Text>
            </View>

            <SettingsSection
                footer={t(owned ? "settings.sync.footer" : "settings.sync.needsAccount")}
                title={t("settings.sync.section")}
            >
                <AccountRow />
                {owned ? (
                    <ToggleRow icon="Cloud" onValueChange={toggle} title={t("settings.sync.toggle")} value={enabled} />
                ) : null}
            </SettingsSection>

            {busy ? <Text className="text-muted text-subtitle pt-2">{t("settings.sync.working")}</Text> : null}

            {capability.kind === "active" ? (
                <SettingsSection title={t("settings.sync.statusSection")}>
                    <LinkRow icon="Cloud" title={t("settings.sync.waiting")} value={String(capability.pending)} />
                    <LinkRow
                        icon="CalendarClock"
                        title={t("settings.sync.lastSynced")}
                        value={
                            capability.syncedAt == null
                                ? t("settings.sync.neverSynced")
                                : `${formatDayHeader(capability.syncedAt, undefined, language)} ${formatTime(capability.syncedAt, use24Hour, language)}`
                        }
                    />
                </SettingsSection>
            ) : null}
        </SettingsScreen>
    );
}
