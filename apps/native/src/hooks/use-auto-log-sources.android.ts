import { useTranslation } from "@/i18n/context";
import { purchaseListener } from "@/lib/purchase-listener";
import { usePurchaseListener } from "@/lib/use-purchase-listener";

import type { useAutoLogSources as useIosAutoLogSources } from "./use-auto-log-sources";

export const useAutoLogSources: typeof useIosAutoLogSources = () => {
    const t = useTranslation();
    const [listener] = usePurchaseListener();

    return [
        {
            detail: t("onboarding.autoLog.bank.detail"),
            icon: "Wallet01",
            id: "purchaseListener",
            on: listener.enabled && listener.allowed.size > 0,
            onSetUp: () => purchaseListener?.openSettings(),
            title: t("nav.settings.wallet"),
        },
    ];
};
