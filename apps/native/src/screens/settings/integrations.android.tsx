import { useRouter } from "expo-router";

import { LinkRow, SettingsSection } from "@/components/list/list-row";
import { SettingsScreen } from "@/components/settings/settings-screen";
import { useDatabase } from "@/contexts/local-data-context";
import { onOffLabel } from "@/data/settings-core";
import { useBankEntry } from "@/hooks/use-bank-overview";
import { useWebhooksOpen } from "@/hooks/use-webhooks-open";
import { useTranslation } from "@/i18n/context";
import { usePurchaseListener } from "@/lib/use-purchase-listener";
import type { Integrations as IosIntegrations } from "@/screens/settings/integrations";

import { CardsSection } from "./wallet-parts";

export const Integrations: typeof IosIntegrations = () => {
    const db = useDatabase();
    const router = useRouter();
    const t = useTranslation();
    const [listener] = usePurchaseListener();
    const webhooksOn = useWebhooksOpen();
    const banks = useBankEntry();

    return (
        <SettingsScreen>
            <SettingsSection>
                <LinkRow
                    icon="Wallet01"
                    onPress={() => router.push("/settings/integrations/wallet")}
                    title={t("nav.settings.wallet")}
                    value={t(onOffLabel(listener.enabled && listener.allowed.size > 0))}
                />
                {banks.shown ? (
                    <LinkRow
                        icon="Landmark"
                        onPress={() => router.push("/settings/integrations/banks")}
                        title={t("nav.settings.banks")}
                        value={banks.accounts > 0 ? String(banks.accounts) : undefined}
                    />
                ) : null}
                {webhooksOn ? (
                    <LinkRow
                        icon="Plug"
                        onPress={() => router.push("/settings/integrations/webhooks")}
                        title={t("nav.settings.webhooks")}
                    />
                ) : null}
            </SettingsSection>
            <CardsSection db={db} />
        </SettingsScreen>
    );
};
