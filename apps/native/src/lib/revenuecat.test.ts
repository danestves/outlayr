import * as Effect from "effect/Effect";
import type { CustomerInfo } from "react-native-purchases";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

vi.mock("react-native-purchases", () => ({
    LOG_LEVEL: { ERROR: "ERROR", WARN: "WARN" },
    __esModule: true,
    default: {
        addCustomerInfoUpdateListener: vi.fn(),
        configure: vi.fn(),
        getCustomerInfo: vi.fn(),
        getOfferings: vi.fn(),
        isAnonymous: vi.fn(),
        logIn: vi.fn(),
        logOut: vi.fn(),
        purchasePackage: vi.fn(),
        removeCustomerInfoUpdateListener: vi.fn(),
        restorePurchases: vi.fn(),
        setDisplayName: vi.fn(),
        setEmail: vi.fn(),
        setLogLevel: vi.fn(),
    },
}));

import Purchases from "react-native-purchases";

import { logOutUser } from "./revenuecat";

const purchases = vi.mocked(Purchases);

beforeEach(() => {
    vi.clearAllMocks();
});

describe("logOutUser", () => {
    it("never calls logOut while the SDK user is anonymous, and reports the resulting entitlement", async () => {
        // SAFETY: only `entitlements.active` is read.
        const anonymousPro = { entitlements: { active: { pro: {} } } } as unknown as CustomerInfo;
        const loggedOut = { entitlements: { active: {} } } as unknown as CustomerInfo;
        purchases.isAnonymous.mockResolvedValue(true);
        purchases.getCustomerInfo.mockResolvedValue(anonymousPro);
        await expect(Effect.runPromise(logOutUser())).resolves.toBe(true);
        expect(purchases.logOut).not.toHaveBeenCalled();

        purchases.isAnonymous.mockResolvedValue(false);
        purchases.logOut.mockResolvedValue(loggedOut);
        await expect(Effect.runPromise(logOutUser())).resolves.toBe(false);
        expect(purchases.logOut).toHaveBeenCalledOnce();
    });
});
