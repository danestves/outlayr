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

    it("stays unconfigured instead of logging when EMAIL_FROM is missing or malformed", async () => {
        vi.stubEnv("EMAIL_FROM", "");

        await expect(runEdge(emailSetup)).resolves.toStrictEqual({ provider: "unconfigured", requested: "cloudflare" });

        for (const malformed of [
            "not-an-address",
            "sender@example..com",
            "sender..name@example.com",
            ".sender@example.com",
        ]) {
            vi.stubEnv("EMAIL_FROM", malformed);

            await expect(runEdge(emailSetup)).resolves.toStrictEqual({
                provider: "unconfigured",
                requested: "cloudflare",
            });
        }

        vi.stubEnv("EMAIL_FROM", "no-reply+auth@tryoutlayr.com");

        await expect(runEdge(emailSetup)).resolves.toMatchObject({
            from: "no-reply+auth@tryoutlayr.com",
            provider: "cloudflare",
        });
    });

    it("stays unconfigured when a provider is only half set", async () => {
        vi.stubEnv("CLOUDFLARE_EMAIL_TOKEN", "");

        await expect(runEdge(emailSetup)).resolves.toStrictEqual({ provider: "unconfigured", requested: "cloudflare" });

        vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", "");
        vi.stubEnv("SMTP_HOST", "smtp.example.com");
        vi.stubEnv("SMTP_USERNAME", "user");

        await expect(runEdge(emailSetup)).resolves.toStrictEqual({ provider: "unconfigured", requested: "smtp" });
    });

    it("ignores an invalid SMTP_PORT when another provider is ready", async () => {
        vi.stubEnv("SMTP_PORT", "abc");

        await expect(runEdge(emailSetup)).resolves.toMatchObject({ provider: "cloudflare" });
    });

    it("stays unconfigured when SMTP_PORT is out of range", async () => {
        vi.stubEnv("EMAIL_PROVIDER", "smtp");
        vi.stubEnv("SMTP_HOST", "smtp.example.com");
        vi.stubEnv("SMTP_PORT", "0");

        await expect(runEdge(emailSetup)).resolves.toStrictEqual({ provider: "unconfigured", requested: "smtp" });
    });
});
