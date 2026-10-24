import { requireOptionalNativeModule } from "expo";

export interface PurchaseSender {
    at: number;
    label: string;
    packageName: string;
    text: string;
}

interface PurchaseListenerModule {
    apps: () => string[];
    isEnabled: () => boolean;
    openSettings: () => void;
    senders: () => PurchaseSender[];
    setApps: (packages: string[]) => void;
    setSnapshot: (json: string) => void;
}

export const purchaseListener = requireOptionalNativeModule<PurchaseListenerModule>("PurchaseListener");
