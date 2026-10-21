import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { deleteItemAsync, getItemAsync, setItemAsync } from "expo-secure-store";

import { resumePersistedCloudDeletion } from "./deletion-resume";

const mockRevokeGoogleProviderSubject = jest.fn();

jest.mock<Partial<typeof import("expo-secure-store")>>("expo-secure-store", () => ({
    deleteItemAsync: jest.fn<typeof import("expo-secure-store").deleteItemAsync>(),
    getItemAsync: jest.fn<typeof import("expo-secure-store").getItemAsync>(),
    setItemAsync: jest.fn<typeof import("expo-secure-store").setItemAsync>(),
}));
jest.mock<Partial<typeof import("@/lib/auth-client")>>("@/lib/auth-client", () => ({ authClient: null }));
jest.mock("@/lib/convex", () => ({
    cloudAction: jest.fn<typeof import("@/lib/convex").cloudAction>(),
    cloudMutation: jest.fn<typeof import("@/lib/convex").cloudMutation>(),
    cloudQuery: jest.fn<typeof import("@/lib/convex").cloudQuery>(),
    convex: {},
}));
jest.mock("@/lib/provider-revocation", () => ({
    revokeGoogleProviderSubject: (...args: unknown[]) => mockRevokeGoogleProviderSubject(...args),
}));

function cloudMocks() {
    return jest.mocked(jest.requireMock<typeof import("@/lib/convex")>("@/lib/convex"));
}

describe("resumePersistedCloudDeletion", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        const { cloudMutation, cloudQuery } = cloudMocks();
        cloudQuery.mockResolvedValueOnce({ phase: "prepared" }).mockResolvedValueOnce({ phase: "complete" });
        cloudMutation.mockResolvedValueOnce({ phase: "providersRevoked" }).mockResolvedValueOnce({ phase: "complete" });
        jest.mocked(getItemAsync).mockResolvedValue(
            JSON.stringify({
                provider: "google",
                providerSubject: "provider-subject",
                receiptChallenge: "challenge",
                resumeSecret: "secret",
            })
        );
    });

    it("resumes a cloud marker through the sessionless provider receipt and deletion job", async () => {
        await resumePersistedCloudDeletion({ clearOnComplete: false, required: true });
        const { cloudMutation } = cloudMocks();

        expect(mockRevokeGoogleProviderSubject).toHaveBeenCalledWith("provider-subject");
        expect(setItemAsync).toHaveBeenCalledWith(
            "outlayr.account-deletion-resume",
            expect.stringContaining("googleLocalReceipt")
        );
        expect(cloudMutation).toHaveBeenCalledWith("accountDeletion:submitGoogleLocalReceipt", {
            receiptChallenge: "challenge",
            resumeSecret: "secret",
        });
        expect(cloudMutation).toHaveBeenCalledWith("accountDeletion:advance", { resumeSecret: "secret" });
        expect(deleteItemAsync).not.toHaveBeenCalled();
    });

    it("resumes a password account without revoking a provider", async () => {
        jest.mocked(getItemAsync).mockResolvedValue(
            JSON.stringify({
                provider: "password",
                providerSubject: "ana@example.com",
                receiptChallenge: "challenge",
                resumeSecret: "secret",
            })
        );

        await resumePersistedCloudDeletion({ clearOnComplete: false, required: true });

        expect(mockRevokeGoogleProviderSubject).not.toHaveBeenCalled();
        expect(cloudMocks().cloudMutation).toHaveBeenCalledWith("accountDeletion:recordCredentialOnly", {
            resumeSecret: "secret",
        });
    });

    it("fails closed when a cloud marker has no usable resume secret", async () => {
        jest.mocked(getItemAsync).mockResolvedValue(null);

        await expect(resumePersistedCloudDeletion({ required: true })).rejects.toThrow("requires reauthentication");
        expect(cloudMocks().cloudMutation).not.toHaveBeenCalled();
    });

    it("maps an expired deletion job to reauthentication without advancing device cleanup", async () => {
        const { cloudMutation, cloudQuery } = cloudMocks();
        cloudQuery.mockReset();
        cloudQuery.mockResolvedValue(null);

        await expect(resumePersistedCloudDeletion({ required: true })).rejects.toThrow("requires reauthentication");
        expect(cloudMutation).not.toHaveBeenCalled();
    });
});

describe("resumePersistedCloudDeletion with no cloud configured", () => {
    beforeEach(() => {
        jest.replaceProperty(cloudMocks(), "convex", null);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("fails closed when the resume is required", async () => {
        await expect(resumePersistedCloudDeletion({ required: true })).rejects.toThrow("requires reauthentication");
    });

    it("reports nothing resumed otherwise", async () => {
        await expect(resumePersistedCloudDeletion()).resolves.toBe(false);
    });
});
