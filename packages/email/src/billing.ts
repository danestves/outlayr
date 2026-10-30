const ANDROID_PACKAGE = "com.tryoutlayr.app";

const STORE_NAMES = { APP_STORE: "App Store", MAC_APP_STORE: "App Store", PLAY_STORE: "Google Play" } as const;

type PaidStore = keyof typeof STORE_NAMES;

export type StoreName = (typeof STORE_NAMES)[PaidStore];

export type Billing =
    | { kind: "family" }
    | { endsAtMs?: number; kind: "granted" }
    | { kind: "lifetime"; storeName: StoreName }
    | { kind: "subscription"; manageUrl: string; renewsAtMs: number; storeName: StoreName };

export interface Entitlement {
    expiresAtMs?: number;
    familyShared: boolean;
    productId?: string;
    store?: string;
}

const isPaidStore = (store: string | undefined): store is PaidStore =>
    store !== undefined && Object.hasOwn(STORE_NAMES, store);

function manageUrl(store: PaidStore, productId: string | undefined) {
    if (store !== "PLAY_STORE") {
        return "https://apps.apple.com/account/subscriptions";
    }
    const url = new URL("https://play.google.com/store/account/subscriptions");
    const sku = productId?.split(":")[0];
    if (sku) {
        url.searchParams.set("sku", sku);
        url.searchParams.set("package", ANDROID_PACKAGE);
    }
    return url.toString();
}

export function billing({ expiresAtMs, familyShared, productId, store }: Entitlement): Billing {
    if (familyShared) {
        return { kind: "family" };
    }
    if (!isPaidStore(store)) {
        return { endsAtMs: expiresAtMs, kind: "granted" };
    }
    const storeName = STORE_NAMES[store];
    if (expiresAtMs === undefined) {
        return { kind: "lifetime", storeName };
    }
    return { kind: "subscription", manageUrl: manageUrl(store, productId), renewsAtMs: expiresAtMs, storeName };
}
