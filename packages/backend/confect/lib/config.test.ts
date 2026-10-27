import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { revenueCatWebhookAuth } from "./config";
import { runEdge } from "./runEdge";

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("REVENUECAT_WEBHOOK_AUTH", () => {
    it("rejects a secret shorter than 32 characters instead of reading it as unset", async () => {
        vi.stubEnv("REVENUECAT_WEBHOOK_AUTH", "x".repeat(31));

        await expect(runEdge(revenueCatWebhookAuth)).rejects.toThrow();
    });

    it("reads a 32 character secret, and an empty one as unset", async () => {
        vi.stubEnv("REVENUECAT_WEBHOOK_AUTH", "x".repeat(32));
        await expect(runEdge(revenueCatWebhookAuth)).resolves.toMatchObject({ _tag: "Some" });

        vi.stubEnv("REVENUECAT_WEBHOOK_AUTH", "");
        await expect(runEdge(revenueCatWebhookAuth)).resolves.toMatchObject({ _tag: "None" });
    });
});
