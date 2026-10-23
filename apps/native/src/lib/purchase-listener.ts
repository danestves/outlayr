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
    setMoneyPattern: (source: string, ignoreCase: boolean) => void;
}

export const purchaseListener = requireOptionalNativeModule<PurchaseListenerModule>("PurchaseListener");
