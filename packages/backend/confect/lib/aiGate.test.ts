/// <reference types="vite/client" />

import { AI_CONSENT_VERSION } from "@outlayr/money/contract";
import { convexTest } from "convex-test";
import * as Effect from "effect/Effect";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import schema from "../../convex/schema";
import { authenticatedAs, seedAuthUser } from "../test.helpers";
import { openAiGate, refuse } from "./aiGate";
import type { AiRefused } from "./aiGate";
import { claudeFastModelId } from "./config";
import { runEdge } from "./runEdge";

const modules = import.meta.glob("../../convex/**/*.ts");

afterEach(() => {
    vi.unstubAllEnvs();
});

type Harness = ReturnType<typeof convexTest>;

interface Attempt {
    admit?: Effect.Effect<void, AiRefused>;
    aiConsent?: number;
    shareAnalytics?: boolean;
}

function knock(t: Pick<Harness, "run">, { admit = Effect.void, ...args }: Attempt) {
    const rungs = vi.fn(() => admit);
    const outcome = t.run((ctx) =>
        runEdge(
            openAiGate(ctx, { admit: rungs, args, feature: "gate_test", modelId: claudeFastModelId }).pipe(
                Effect.map(({ distinctId }) => ({ distinctId: distinctId ?? null, status: "admitted" as const })),
                Effect.catchTags({ AiRefused: ({ status }) => Effect.succeed({ status }) })
            )
        )
    );
    return { outcome, rungs };
}

describe(openAiGate, () => {
    it("refuses a signed-out caller first, whatever else is missing", async () => {
        vi.stubEnv("ANTHROPIC_API_KEY", "");
        const { outcome, rungs } = knock(convexTest(schema, modules), {});

        await expect(outcome).resolves.toStrictEqual({ status: "unauthenticated" });
        expect(rungs).not.toHaveBeenCalled();
    });

    it("refuses a token that outlived its revoked session", async () => {
        vi.stubEnv("ANTHROPIC_API_KEY", "test-anthropic-key");
        const t = convexTest(schema, modules);
        const identity = await seedAuthUser(t);
        const stale = t.withIdentity({ sessionId: "session-that-was-revoked", subject: identity.subject });

        await expect(knock(stale, { aiConsent: AI_CONSENT_VERSION }).outcome).resolves.toStrictEqual({
            status: "unauthenticated",
        });
    });

    it("answers notConfigured without the provider key, before any of the group's rungs", async () => {
        vi.stubEnv("ANTHROPIC_API_KEY", "");
        const t = convexTest(schema, modules);
        const { outcome, rungs } = knock(authenticatedAs(t, await seedAuthUser(t)), { aiConsent: AI_CONSENT_VERSION });

        await expect(outcome).resolves.toStrictEqual({ status: "notConfigured" });
        expect(rungs).not.toHaveBeenCalled();
    });

    it.each([undefined, AI_CONSENT_VERSION - 1, AI_CONSENT_VERSION + 1])(
        "hands out no model and runs no rung for consent version %j",
        async (aiConsent) => {
            vi.stubEnv("ANTHROPIC_API_KEY", "test-anthropic-key");
            const t = convexTest(schema, modules);
            const { outcome, rungs } = knock(authenticatedAs(t, await seedAuthUser(t)), { aiConsent });

            await expect(outcome).resolves.toStrictEqual({ status: "notConfigured" });
            expect(rungs).not.toHaveBeenCalled();
        }
    );

    it("withholds the model when one of the group's rungs refuses", async () => {
        vi.stubEnv("ANTHROPIC_API_KEY", "test-anthropic-key");
        const t = convexTest(schema, modules);
        const { outcome } = knock(authenticatedAs(t, await seedAuthUser(t)), {
            admit: refuse("rateLimited"),
            aiConsent: AI_CONSENT_VERSION,
        });

        await expect(outcome).resolves.toStrictEqual({ status: "rateLimited" });
    });

    it("names the caller to analytics only when they share it", async () => {
        vi.stubEnv("ANTHROPIC_API_KEY", "test-anthropic-key");
        const t = convexTest(schema, modules);
        const identity = await seedAuthUser(t);
        const asUser = authenticatedAs(t, identity);

        await expect(knock(asUser, { aiConsent: AI_CONSENT_VERSION }).outcome).resolves.toStrictEqual({
            distinctId: null,
            status: "admitted",
        });
        await expect(
            knock(asUser, { aiConsent: AI_CONSENT_VERSION, shareAnalytics: true }).outcome
        ).resolves.toStrictEqual({ distinctId: identity.subject, status: "admitted" });
    });
});
