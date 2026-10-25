import { Button } from "panelui-native/components/button";
import { Linking } from "react-native";

import bankAddFrame from "@/assets/images/recipe/bank-add.webp";
import bankOnFrame from "@/assets/images/recipe/bank-on.webp";
import bankPickFrame from "@/assets/images/recipe/bank-pick.webp";
import { LinkRow, SettingsSection } from "@/components/list/list-row";
import { SettingsScreen } from "@/components/settings/settings-screen";
import { Text } from "@/components/text";
import { useDatabase } from "@/contexts/local-data-context";
import { onOffLabel } from "@/data/settings-core";
import { useWalletMeta } from "@/data/use-wallet-meta";
import { useTranslation } from "@/i18n/context";
import { notifyFailure } from "@/lib/notify";
import { BANK_SHORTCUT_URL, openShortcutsAutomations } from "@/lib/wallet-shortcut";

import { CheckRow, FrameStrip, ProofBlock } from "./wallet-parts";
import type { Step } from "./wallet-parts";

const BANK_STEPS: readonly Step[] = [
    { frame: bankAddFrame, title: "settings.wallet.bankStep1" },
    { frame: bankPickFrame, title: "settings.wallet.bankStep2" },
    { frame: bankOnFrame, title: "settings.wallet.bankStep3" },
];

const LINE_BREAKS = /\s*\n\s*/g;

export function BankNotifications() {
    const db = useDatabase();
    const t = useTranslation();
    const { lastNotification } = useWalletMeta(db);
    const getBankShortcut = () => {
        Linking.openURL(BANK_SHORTCUT_URL).catch((cause: unknown) => {
            console.error("Opening the bank shortcut failed", cause);
            notifyFailure({ title: t("settings.wallet.bankGet") });
        });
    };

    if (!lastNotification) {
        return (
            <SettingsScreen>
                <Text className="text-muted text-body pt-6 leading-snug">{t("settings.wallet.bankLead")}</Text>
                <FrameStrip steps={BANK_STEPS} />
                <Button className="mt-3 rounded-full" fullWidth onPress={getBankShortcut} size="md" variant="primary">
                    {t("settings.wallet.bankGet")}
                </Button>
                <Text className="text-muted text-subtitle pt-2 leading-snug">{t("settings.wallet.bankFooter")}</Text>
            </SettingsScreen>
        );
    }

    return (
        <SettingsScreen>
            <SettingsSection>
                <CheckRow detail={t("settings.wallet.bankShortcutName")} title={t(onOffLabel(true))} />
            </SettingsSection>
            <ProofBlock
                detail={lastNotification.text.replaceAll(LINE_BREAKS, " · ")}
                label={t("settings.wallet.lastNotification")}
                title={lastNotification.amountText ?? t("settings.wallet.notificationUnread")}
            />
            <SettingsSection footer={t("settings.wallet.bankFooter")} title={t("settings.wallet.setupSection")}>
                <LinkRow onPress={openShortcutsAutomations} title={t("settings.wallet.open")} />
                <LinkRow onPress={getBankShortcut} title={t("settings.wallet.bankGet")} />
            </SettingsSection>
        </SettingsScreen>
    );
}
