import { useRouter } from "expo-router";

import { LinkRow, SettingsSection } from "@/components/list/list-row";
import { SettingsScreen } from "@/components/settings/settings-screen";
import { useDatabase } from "@/contexts/local-data-context";
import { onOffLabel } from "@/data/settings-core";
import { useWalletMeta } from "@/data/use-wallet-meta";
import { formatSentenceDate } from "@/domain/dates";
import { useLanguage, useTranslation } from "@/i18n/context";
import { TRIGGERS_IN_SHORTCUTS } from "@/lib/wallet-shortcut";

import { CardsSection } from "./wallet-parts";

export function Integrations() {
    const db = useDatabase();
    const router = useRouter();
    const t = useTranslation();
    const { language } = useLanguage();
    const { applePayOn, lastEntry, lastNotification, lastRunAt } = useWalletMeta(db);
    const lastUsed = (at: number | undefined) =>
        at === undefined
            ? undefined
            : t("settings.wallet.lastTap", { when: formatSentenceDate(new Date(at), language) });

    return (
        <SettingsScreen>
            <SettingsSection>
                <LinkRow
                    detail={applePayOn ? lastUsed(lastRunAt ?? lastEntry?.at) : undefined}
                    icon="Wallet01"
                    onPress={() => router.push("/settings/integrations/wallet")}
                    title={t("nav.settings.wallet")}
                    value={t(onOffLabel(applePayOn))}
                />
                {TRIGGERS_IN_SHORTCUTS ? (
                    <LinkRow
                        detail={lastUsed(lastNotification?.at)}
                        icon="Bank"
                        onPress={() => router.push("/settings/integrations/bank")}
                        title={t("settings.wallet.bankSection")}
                        value={t(onOffLabel(lastNotification != null))}
                    />
                ) : null}
            </SettingsSection>
            <CardsSection db={db} />
        </SettingsScreen>
    );
}
