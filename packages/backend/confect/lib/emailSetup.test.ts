import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { emailSetup } from "./emailSetup";
import { runEdge } from "./runEdge";

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("emailSetup", () => {
    it("picks Cloudflare when only its variables are set", async () => {
        await expect(runEdge(emailSetup)).resolves.toMatchObject({
            accountId: "test-cloudflare-account",
            from: "no-reply@tryoutlayr.com",
            provider: "cloudflare",
        });
    });

    it("writes to the log when no provider has values, even if the variables exist empty", async () => {
        vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", "");
        vi.stubEnv("CLOUDFLARE_EMAIL_TOKEN", "");

        await expect(runEdge(emailSetup)).resolves.toStrictEqual({ provider: "log" });
    });

    it("stays unconfigured when EMAIL_PROVIDER names a provider without its variables", async () => {
        vi.stubEnv("EMAIL_PROVIDER", "resend");

        await expect(runEdge(emailSetup)).resolves.toStrictEqual({ provider: "unconfigured", requested: "resend" });
    });

    it("stays unconfigured instead of logging when a provider has no EMAIL_FROM", async () => {
        vi.stubEnv("EMAIL_FROM", "");

        await expect(runEdge(emailSetup)).resolves.toStrictEqual({ provider: "unconfigured", requested: "cloudflare" });
    });
});
