import { useTranslation } from "@/i18n/context";
import { purchaseListener } from "@/lib/purchase-listener";
import { usePurchaseListener } from "@/lib/use-purchase-listener";

import type {
    useAutoLogSources as useIosAutoLogSources,
    useBankTexts as useIosBankTexts,
} from "./use-auto-log-sources";

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

export const useBankTexts: typeof useIosBankTexts = () => {
    const [listener, refresh] = usePurchaseListener();
    const { messagesApp } = listener;
    if (messagesApp === null) {
        return null;
    }

    return {
        done: listener.enabled && listener.allowed.has(messagesApp),
        onSetUp: () => {
            purchaseListener?.allowMessages();
            if (listener.enabled) {
                refresh();
            } else {
                purchaseListener?.openSettings();
            }
        },
    };
};
