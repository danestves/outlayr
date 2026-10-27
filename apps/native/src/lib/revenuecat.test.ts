import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as Effect from "effect/Effect";
import type { CustomerInfo } from "react-native-purchases";

jest.mock("react-native-purchases", () => ({
    LOG_LEVEL: { ERROR: "ERROR", WARN: "WARN" },
    __esModule: true,
    default: {
        addCustomerInfoUpdateListener: jest.fn(),
        configure: jest.fn(),
        getCustomerInfo: jest.fn(),
        getOfferings: jest.fn(),
        isAnonymous: jest.fn(),
        logIn: jest.fn(),
        logOut: jest.fn(),
        purchasePackage: jest.fn(),
        removeCustomerInfoUpdateListener: jest.fn(),
        restorePurchases: jest.fn(),
        setDisplayName: jest.fn(),
        setEmail: jest.fn(),
        setLogLevel: jest.fn(),
    },
}));

import Purchases from "react-native-purchases";

import { logOutUser } from "./revenuecat";

const purchases = jest.mocked(Purchases);

beforeEach(() => {
    jest.clearAllMocks();
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
        expect(purchases.logOut).toHaveBeenCalledTimes(1);
    });
});
