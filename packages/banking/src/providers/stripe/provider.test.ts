import * as ConfigProvider from "effect/ConfigProvider";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Option from "effect/Option";
import { describe, expect, it } from "vite-plus/test";

import type { BankingClient, BankingError } from "../../provider";
import { stripe } from "./provider";

const WEBHOOK_SECRET = "whsec_banking_test";
const ENV = { STRIPE_BANKING_WEBHOOK_SECRET: WEBHOOK_SECRET, STRIPE_SECRET_KEY: "sk_test_banking" };

const client = (env: Record<string, string>): BankingClient =>
    Option.getOrThrow(
        Effect.runSync(
            stripe.connect.pipe(Effect.provideService(ConfigProvider.ConfigProvider, ConfigProvider.fromEnv({ env })))
        )
    );

const signedHeader = async (body: string) => {
    const timestamp = Math.floor(Date.now() / 1000);
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(WEBHOOK_SECRET),
        { hash: "SHA-256", name: "HMAC" },
        false,
        ["sign"]
    );
    const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${body}`));
    const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `t=${timestamp},v1=${hex}`;
};

const failureReason = async (effect: Effect.Effect<unknown, BankingError>) => {
    const exit = await Effect.runPromiseExit(effect);
    if (Exit.isSuccess(exit)) {
        throw new Error("Expected a failure");
    }
    return exit.cause.reasons.find((reason) => reason._tag === "Fail")?.error.reason;
};

const event = (type: string, object: unknown) => JSON.stringify({ data: { object }, type });

const read = async (body: string) =>
    Effect.runPromise(client(ENV).readWebhook(body, new Headers({ "stripe-signature": await signedHeader(body) })));

const refreshed = (status: string) =>
    event("financial_connections.account.refreshed_transactions", { id: "fca_1", transaction_refresh: { status } });

describe("readWebhook", () => {
    it("reports the account whose transactions refreshed", async () => {
        await expect(read(refreshed("succeeded"))).resolves.toStrictEqual(
            Option.some({ accountId: "fca_1", kind: "transactions" })
        );
    });

    it("skips a refresh that failed, so the cursor is not pulled for nothing", async () => {
        await expect(read(refreshed("failed"))).resolves.toStrictEqual(Option.none());
    });

    it("reports a deactivated account as an account change, not a status to apply", async () => {
        const body = event("financial_connections.account.deactivated", { id: "fca_1", transaction_refresh: null });
        await expect(read(body)).resolves.toStrictEqual(Option.some({ accountId: "fca_1", kind: "account" }));
    });

    it("rejects an unsigned body", async () => {
        const body = refreshed("succeeded");
        await expect(failureReason(client(ENV).readWebhook(body, new Headers()))).resolves.toBe("unverified");
    });

    it("ignores an event type the provider does not map", async () => {
        await expect(read(event("customer.created", { id: "cus_1" }))).resolves.toStrictEqual(Option.none());
    });
});
