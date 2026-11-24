import { requireOptionalNativeModule } from "expo";

export interface PurchaseSender {
    at: number;
    from: string | null;
    label: string;
    on: boolean;
    packageName: string;
    text: string;
}

interface PurchaseListenerModule {
    allowMessages: () => void;
    apps: () => string[];
    claimQueue: (name: string) => boolean;
    eraseQueue: () => void;
    isEnabled: () => boolean;
    messagesApp: () => string | null;
    openSettings: () => void;
    queueSequence: () => number;
    senders: () => PurchaseSender[];
    setApps: (packages: string[]) => void;
    setSender: (from: string, on: boolean) => void;
    setSnapshot: (json: string) => void;
}

export const purchaseListener = requireOptionalNativeModule<PurchaseListenerModule>("PurchaseListener");
