import { trackAutologSetup } from "@/lib/autolog-events";
import { purchaseListener } from "@/lib/purchase-listener";
import { openListenerAccess, settleAccess, usePurchaseListener } from "@/lib/use-purchase-listener";

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
                trackAutologSetup({ outcome: "started", surface: "onboarding", trigger: "bank_texts" });
                settleAccess({ surface: "onboarding", trigger: "bank_texts" });
                refresh();
            } else {
                openListenerAccess({ surface: "onboarding", trigger: "bank_texts" });
            }
        },
    };
}
