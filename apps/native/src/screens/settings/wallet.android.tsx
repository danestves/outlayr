import { Switch } from "@expo/ui/jetpack-compose";
import { eq } from "drizzle-orm";
import { Button } from "panelui-native/components/button";
import { View } from "react-native";

import { LinkRow, SettingsSection } from "@/components/list/list-row";
import { ListItemFrame } from "@/components/list/material-list-item";
import { MaterialHost } from "@/components/material-host";
import { SettingsScreen } from "@/components/settings/settings-screen";
import { Text } from "@/components/text";
import { useDatabase } from "@/contexts/local-data-context";
import { META_KEYS } from "@/data/app-meta-core";
import { useLiveValue } from "@/data/live-query";
import { parseLastWalletEntry } from "@/data/pending-writes-core";
import { onOffLabel } from "@/data/settings-core";
import { appMeta } from "@/db/schema";
import { useTranslation } from "@/i18n/context";
import { posthog } from "@/lib/posthog";
import { purchaseListener } from "@/lib/purchase-listener";
import type { PurchaseSender } from "@/lib/purchase-listener";
import { usePurchaseListener } from "@/lib/use-purchase-listener";
import type { Wallet as IosWallet } from "@/screens/settings/wallet";

import { LastEntry } from "./wallet-parts";

const LINE_BREAKS = /\s*\n\s*/g;

function openSettings() {
    purchaseListener?.openSettings();
}

export const Wallet: typeof IosWallet = () => {
    const db = useDatabase();
    const t = useTranslation();
    const [listener, refreshListener] = usePurchaseListener();
    const last = useLiveValue(
        appMeta,
        () => db.select().from(appMeta).where(eq(appMeta.key, META_KEYS.lastWalletEntry)),
        (rows) => rows[0]?.value ?? null
    );
    const lastEntry = parseLastWalletEntry(last);

    const toggle = (packageName: string, on: boolean) => {
        const next = new Set(listener.allowed);
        if (on) {
            next.add(packageName);
        } else {
            next.delete(packageName);
        }
        purchaseListener?.setApps([...next]);
        posthog?.setPersonProperties({ autolog_enabled: next.size > 0 });
        refreshListener();
    };

    if (!listener.enabled) {
        return (
            <SettingsScreen>
                <View className="gap-5 pt-6">
                    <Text className="text-m3-on-surface-variant text-body leading-snug">
                        {t("settings.wallet.androidLead")}
                    </Text>
                    <Button className="rounded-full" fullWidth onPress={openSettings} size="md" variant="primary">
                        {t("settings.wallet.allowAccess")}
                    </Button>
                    <Text className="text-m3-on-surface-variant text-caption leading-5">
                        {t("settings.wallet.allowAccessDetail")}
                    </Text>
                </View>
            </SettingsScreen>
        );
    }

    return (
        <SettingsScreen>
            {lastEntry ? (
                <LastEntry db={db} txId={lastEntry.txId} />
            ) : (
                <Text className="text-m3-on-surface-variant text-body pt-6 leading-snug">
                    {t("settings.wallet.androidLead")}
                </Text>
            )}

            <SettingsSection
                footer={listener.senders.length > 0 ? t("settings.wallet.sourcesFooter") : undefined}
                title={t("settings.wallet.sourcesSection")}
            >
                {listener.senders.length === 0 ? (
                    <Text className="text-m3-on-surface-variant text-body py-3.5">
                        {t("settings.wallet.noSources")}
                    </Text>
                ) : (
                    listener.senders.map((sender) => (
                        <SourceRow
                            key={sender.packageName}
                            on={listener.allowed.has(sender.packageName)}
                            onToggle={(on) => toggle(sender.packageName, on)}
                            sender={sender}
                        />
                    ))
                )}
            </SettingsSection>

            <View className="pt-5">
                <LinkRow onPress={openSettings} title={t("settings.wallet.accessRow")} value={t(onOffLabel(true))} />
            </View>
        </SettingsScreen>
    );
};

function SourceRow({ sender, on, onToggle }: { on: boolean; onToggle: (on: boolean) => void; sender: PurchaseSender }) {
    return (
        <ListItemFrame
            accessibilityLabel={sender.label}
            accessibilityRole="switch"
            accessibilityState={{ checked: on }}
            onPress={() => onToggle(!on)}
            twoLine
        >
            <View className="flex-1">
                <Text className="text-m3-on-surface text-body leading-6">{sender.label}</Text>
                <Text className="text-m3-on-surface-variant text-caption leading-5" numberOfLines={1}>
                    {sender.text.replaceAll(LINE_BREAKS, " · ")}
                </Text>
            </View>
            <View importantForAccessibility="no-hide-descendants">
                <MaterialHost matchContents>
                    <Switch value={on} />
                </MaterialHost>
            </View>
        </ListItemFrame>
    );
}
