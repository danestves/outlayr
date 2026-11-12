import { purchaseListener } from "@/lib/purchase-listener";
import { usePurchaseListener } from "@/lib/use-purchase-listener";

export interface BankTexts {
    done: boolean;
    onSetUp: () => void;
}

export function useBankTexts(): BankTexts | null {
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
}
