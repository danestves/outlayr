/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import schema from "../convex/schema";

const modules = import.meta.glob("../convex/**/*.ts");

const allowedOrigin = async (origin: string) => {
    const t = convexTest(schema, modules);
    const response = await t.fetch("/billing/checkout", { headers: { Origin: origin }, method: "OPTIONS" });
    return response.headers.get("Access-Control-Allow-Origin");
};

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("billing checkout cors", () => {
    it("lets the old web host start a checkout while LEGACY_WEB_ORIGIN is set", async () => {
        vi.stubEnv("SITE_URL", "https://app.tryoutlayr.com");
        vi.stubEnv("LEGACY_WEB_ORIGIN", "https://tryoutlayr.com");

        await expect(allowedOrigin("https://tryoutlayr.com")).resolves.toBe("https://tryoutlayr.com");
        await expect(allowedOrigin("https://evil.example")).resolves.toBe("https://app.tryoutlayr.com");
    });

    it("allows only the site url when LEGACY_WEB_ORIGIN is unset", async () => {
        vi.stubEnv("SITE_URL", "https://app.tryoutlayr.com");
        vi.stubEnv("LEGACY_WEB_ORIGIN", "");

        await expect(allowedOrigin("https://tryoutlayr.com")).resolves.toBe("https://app.tryoutlayr.com");
    });
});
