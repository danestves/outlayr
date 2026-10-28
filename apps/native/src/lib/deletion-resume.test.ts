import * as Effect from "effect/Effect";
import { deleteItemAsync, getItemAsync, setItemAsync } from "expo-secure-store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { resumePersistedCloudDeletion } from "./deletion-resume";
import { layer } from "./secure-storage";

const mockRevokeGoogleProviderSubject = vi.fn<(subject: string) => Effect.Effect<void>>(() => Effect.void);

const run = (options?: Parameters<typeof resumePersistedCloudDeletion>[0]) =>
    resumePersistedCloudDeletion(options).pipe(Effect.provide(layer));

vi.mock<typeof import("expo-secure-store")>(import("expo-secure-store"), async (importOriginal) => ({
    ...(await importOriginal()),
    deleteItemAsync: vi.fn<typeof import("expo-secure-store").deleteItemAsync>(),
    getItemAsync: vi.fn<typeof import("expo-secure-store").getItemAsync>(),
    setItemAsync: vi.fn<typeof import("expo-secure-store").setItemAsync>(),
}));
vi.mock<Partial<typeof import("@/lib/auth-client")>>(import("@/lib/auth-client"), () => ({ authClient: null }));
vi.mock("@/lib/convex", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/lib/convex")>()),
    cloudAction: vi.fn<typeof import("@/lib/convex").cloudAction>(),
    cloudMutation: vi.fn<typeof import("@/lib/convex").cloudMutation>(),
    cloudQuery: vi.fn<typeof import("@/lib/convex").cloudQuery>(),
    convex: {},
}));
vi.mock("@/lib/posthog", () => ({ posthog: null }));
vi.mock("@/lib/provider-revocation", () => ({
    revokeGoogleProviderSubject: (subject: string) => mockRevokeGoogleProviderSubject(subject),
}));

const mockedConvex = vi.mocked(await import("@/lib/convex"));

function cloudMocks() {
    return mockedConvex;
}

describe("resumePersistedCloudDeletion", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        const { cloudMutation, cloudQuery } = cloudMocks();
        cloudQuery
            .mockReturnValueOnce(Effect.succeed({ phase: "prepared" }))
            .mockReturnValueOnce(Effect.succeed({ phase: "complete" }));
        cloudMutation
            .mockReturnValueOnce(Effect.succeed({ phase: "providersRevoked" }))
            .mockReturnValueOnce(Effect.succeed({ phase: "complete" }));
        vi.mocked(setItemAsync).mockResolvedValue();
        vi.mocked(deleteItemAsync).mockResolvedValue();
        vi.mocked(getItemAsync).mockResolvedValue(
            JSON.stringify({
                provider: "google",
                providerSubject: "provider-subject",
                receiptChallenge: "challenge",
                resumeSecret: "secret",
            })
        );
    });

    it("resumes a cloud marker through the sessionless provider receipt and deletion job", async () => {
        await Effect.runPromise(run({ clearOnComplete: false, required: true }));
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
        vi.mocked(getItemAsync).mockResolvedValue(
            JSON.stringify({
                provider: "password",
                providerSubject: "ana@example.com",
                receiptChallenge: "challenge",
                resumeSecret: "secret",
            })
        );

        await Effect.runPromise(run({ clearOnComplete: false, required: true }));

        expect(mockRevokeGoogleProviderSubject).not.toHaveBeenCalled();
        expect(cloudMocks().cloudMutation).toHaveBeenCalledWith("accountDeletion:recordCredentialOnly", {
            resumeSecret: "secret",
        });
    });

    it("fails closed when a cloud marker has no usable resume secret", async () => {
        vi.mocked(getItemAsync).mockResolvedValue(null);

        const failure = await Effect.runPromise(run({ required: true }).pipe(Effect.flip));
        expect(failure.message).toContain("requires reauthentication");
        expect(cloudMocks().cloudMutation).not.toHaveBeenCalled();
    });

    it("maps an expired deletion job to reauthentication without advancing device cleanup", async () => {
        const { cloudMutation, cloudQuery } = cloudMocks();
        cloudQuery.mockReset();
        cloudQuery.mockReturnValue(Effect.succeed(null));

        const failure = await Effect.runPromise(run({ required: true }).pipe(Effect.flip));
        expect(failure.message).toContain("requires reauthentication");
        expect(cloudMutation).not.toHaveBeenCalled();
    });
});

describe("resumePersistedCloudDeletion with no cloud configured", () => {
    beforeEach(() => {
        vi.spyOn(cloudMocks(), "convex", "get").mockReturnValue(null);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("fails closed when the resume is required", async () => {
        const failure = await Effect.runPromise(run({ required: true }).pipe(Effect.flip));
        expect(failure.message).toContain("requires reauthentication");
    });

    it("reports nothing resumed otherwise", async () => {
        await expect(Effect.runPromise(run())).resolves.toBe(false);
    });
});
