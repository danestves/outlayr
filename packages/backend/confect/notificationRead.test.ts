/// <reference types="vite/client" />

import { fakeModel } from "@outlayr/ai/testing";
import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { runEdge } from "./lib/runEdge";
import { readNotification } from "./notificationRead";
import { authenticatedAs, seedAuthUser } from "./test.helpers";

const modules = import.meta.glob("../convex/**/*.ts");

afterEach(() => {
    vi.unstubAllEnvs();
});

const mockModel = (text: string) => fakeModel([{ text }]).model;

const SITEGROUND =
    "Your transaction was successful\nYour SiteGround transaction in the amount of USD 22.99 on Nov 02 2026, 20:44 CST was approved on the card ending with 7909.";

describe("notificationRead guards", () => {
    it("never sends the text from a build without the current AI consent", async () => {
        vi.stubEnv("ANTHROPIC_API_KEY", "test-anthropic-key");
        const t = convexTest(schema, modules);
        const identity = await seedAuthUser(t);

        await expect(
            authenticatedAs(t, identity).action(api.notificationRead.read, { text: SITEGROUND })
        ).resolves.toStrictEqual({ read: null, status: "notConfigured" });
    });
});

describe("readNotification", () => {
    it("drops what the model made up: a negative amount, an unknown currency, a blank merchant", async () => {
        const model = mockModel(
            JSON.stringify({ amount: -22.99, currency: "dollars", kind: "purchase", merchant: "   " })
        );

        await expect(runEdge(readNotification(model, SITEGROUND, "en-US"))).resolves.toStrictEqual({
            read: { amount: null, currency: null, debt: null, kind: "purchase", merchant: null },
            status: "ok",
        });
    });

    it("keeps a clean read and normalizes the currency code", async () => {
        const model = mockModel(
            JSON.stringify({ amount: 22.99, currency: "usd", kind: "purchase", merchant: " SiteGround " })
        );

        await expect(runEdge(readNotification(model, SITEGROUND, undefined))).resolves.toStrictEqual({
            read: { amount: 22.99, currency: "USD", debt: null, kind: "purchase", merchant: "SiteGround" },
            status: "ok",
        });
    });

    it("keeps a debt only with its verb, and drops an installment count that cannot be", async () => {
        const cuota = mockModel(
            JSON.stringify({
                amount: 15,
                currency: null,
                debt: { installment: { number: 2, of: 1 }, verb: "paidBack" },
                kind: "debt",
                merchant: null,
            })
        );
        const bare = mockModel(
            JSON.stringify({ amount: 30, currency: null, debt: null, kind: "debt", merchant: null })
        );

        await expect(runEdge(readNotification(cuota, "Pagaste la cuota 2 de $15", "es-VE"))).resolves.toMatchObject({
            read: { debt: { installment: { number: 2, of: null }, verb: "paidBack" }, kind: "debt" },
        });
        await expect(runEdge(readNotification(bare, "Me debes $30", "es-VE"))).resolves.toMatchObject({
            read: { debt: null, kind: "other" },
        });
    });

    it("reports invalidResponse when the model answers outside the shape", async () => {
        const model = mockModel(JSON.stringify({ kind: "maybe" }));

        await expect(runEdge(readNotification(model, SITEGROUND, undefined))).resolves.toStrictEqual({
            read: null,
            status: "invalidResponse",
        });
    });
});
