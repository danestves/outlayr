import { useRouter } from "expo-router";
import { Button } from "panelui-native/components/button";
import { View } from "react-native";

import { LinkRow, SettingsSection } from "@/components/list/list-row";
import { SettingsScreen } from "@/components/settings/settings-screen";
import { Text } from "@/components/text";
import { useDatabase } from "@/contexts/local-data-context";
import { useMeta } from "@/data/app-meta";
import { onOffLabel } from "@/data/settings-core";
import { useTranslation } from "@/i18n/context";
import { posthog } from "@/lib/posthog";
import { purchaseListener } from "@/lib/purchase-listener";
import { usePurchaseListener } from "@/lib/use-purchase-listener";
import type { Wallet as IosWallet } from "@/screens/settings/wallet";

import { SourceRow } from "./source-row";
import { LastEntry } from "./wallet-parts";

function openSettings() {
    purchaseListener?.openSettings();
}

export const Wallet: typeof IosWallet = () => {
    const db = useDatabase();
    const router = useRouter();
    const t = useTranslation();
    const [listener, refreshListener] = usePurchaseListener();
    const lastEntry = useMeta(db, "lastWalletEntry");
    const apps = listener.senders.filter((sender) => sender.from === null);
    const texts = listener.senders.filter((sender) => sender.from !== null);
    const textsOn = texts.filter((sender) => sender.on);

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
                    <>
                        {apps.map((sender) => (
                            <SourceRow
                                key={sender.packageName}
                                label={sender.label}
                                lines={1}
                                on={sender.on}
                                onToggle={(on) => toggle(sender.packageName, on)}
                                text={sender.text}
                            />
                        ))}
                        {texts.length > 0 ? (
                            <LinkRow
                                detail={textsOn.map((sender) => sender.from).join(", ")}
                                onPress={() => router.push("/settings/integrations/messages")}
                                title={t("settings.wallet.messages")}
                                value={t("settings.wallet.sendersOn", {
                                    on: String(textsOn.length),
                                    total: String(texts.length),
                                })}
                            />
                        ) : null}
                    </>
                )}
            </SettingsSection>

            <View className="pt-5">
                <LinkRow onPress={openSettings} title={t("settings.wallet.accessRow")} value={t(onOffLabel(true))} />
            </View>
        </SettingsScreen>
    );
};
