import { useRouter } from "expo-router";

import { LinkRow, SettingsSection } from "@/components/list/list-row";
import { SettingsScreen } from "@/components/settings/settings-screen";
import { useDatabase } from "@/contexts/local-data-context";
import { onOffLabel } from "@/data/settings-core";
import { useTranslation } from "@/i18n/context";
import { usePurchaseListener } from "@/lib/use-purchase-listener";
import type { Integrations as IosIntegrations } from "@/screens/settings/integrations";

import { CardsSection } from "./wallet-parts";

export const Integrations: typeof IosIntegrations = () => {
    const db = useDatabase();
    const router = useRouter();
    const t = useTranslation();
    const [listener] = usePurchaseListener();

    return (
        <SettingsScreen>
            <SettingsSection>
                <LinkRow
                    icon="Wallet01"
                    onPress={() => router.push("/settings/integrations/wallet")}
                    title={t("nav.settings.wallet")}
                    value={t(onOffLabel(listener.enabled && listener.allowed.size > 0))}
                />
            </SettingsSection>
            <CardsSection db={db} />
        </SettingsScreen>
    );
};
