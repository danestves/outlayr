/// <reference types="vite/client" />
import betterAuthTest from "@convex-dev/better-auth/test";
import { PRO_ENTITLEMENT_ID } from "@outlayr/money/contract";
import { symmetricEncrypt } from "better-auth/crypto";
import { RevenueCat } from "convex-revenuecat";
import type { TestConvex } from "convex-test";
import type { GenericSchema, SchemaDefinition } from "convex/server";
import * as Effect from "effect/Effect";
import * as HttpClient from "effect/http/HttpClient";
import * as HttpClientRequest from "effect/http/HttpClientRequest";
import * as HttpClientResponse from "effect/http/HttpClientResponse";
import * as Layer from "effect/Layer";

import { components } from "../convex/_generated/api";
import { createAuth } from "./lib/betterAuth";

// `safeGetAuthUser` needs both an unexpired `session` row (`identity.sessionId`) and a `user` row (`identity.subject`).

const SESSION_TTL_MS = 86_400_000;

const silentRevenuecat = new RevenueCat(components.revenuecat);

type AnyTestConvex = TestConvex<SchemaDefinition<GenericSchema, boolean>>;

export interface SeededIdentity {
    email: string;
    sessionId: string;
    subject: string;
    userId: string;
}

interface SeedOptions {
    email?: string;
    name?: string;
}

const registeredInstances = new WeakSet<object>();
let seedCounter = 0;

// `registerComponent` replaces the component's in-memory database, so a second call wipes seeded users.
function ensureAuthComponentRegistered(t: AnyTestConvex): void {
    if (registeredInstances.has(t)) {
        return;
    }
    betterAuthTest.register(t);
    registeredInstances.add(t);
}

export async function seedAuthUser(t: AnyTestConvex, options?: SeedOptions): Promise<SeededIdentity> {
    ensureAuthComponentRegistered(t);

    seedCounter += 1;
    const uniqueSuffix = `${Date.now().toString(36)}-${seedCounter}`;
    const email = options?.email ?? `user-${uniqueSuffix}@example.com`;
    const name = options?.name ?? `Test User ${seedCounter}`;
    const now = Date.now();

    const { userId, sessionId } = await t.run(async (ctx) => {
        const user = (await ctx.runMutation(components.betterAuth.adapter.create, {
            input: {
                data: {
                    createdAt: now,
                    email,
                    emailVerified: true,
                    name,
                    updatedAt: now,
                },
                model: "user",
            },
        })) as { _id: string };

        const session = (await ctx.runMutation(components.betterAuth.adapter.create, {
            input: {
                data: {
                    createdAt: now,
                    expiresAt: now + SESSION_TTL_MS,
                    token: `session-token-${uniqueSuffix}`,
                    updatedAt: now,
                    userId: user._id,
                },
                model: "session",
            },
        })) as { _id: string };

        return { sessionId: session._id, userId: user._id };
    });

    return { email, sessionId, subject: userId, userId };
}

export function authenticatedAs(t: AnyTestConvex, identity: SeededIdentity): AnyTestConvex {
    return t.withIdentity({
        sessionId: identity.sessionId,
        subject: identity.subject,
    }) as AnyTestConvex;
}

export async function seedProUser(t: AnyTestConvex, options?: SeedOptions): Promise<SeededIdentity> {
    const identity = await seedAuthUser(t, options);
    await grantPro(t, identity);
    return identity;
}

export async function grantPro(t: AnyTestConvex, identity: Pick<SeededIdentity, "userId">): Promise<void> {
    await t.run((ctx) =>
        silentRevenuecat.syncSubscriber(ctx, {
            appUserId: identity.userId,
            subscriber: {
                entitlements: {
                    [PRO_ENTITLEMENT_ID]: {
                        expires_date: null,
                        product_identifier: "com.tryoutlayr.app.pro.lifetime",
                        purchase_date: new Date().toISOString(),
                    },
                },
            },
        })
    );
}

export async function linkNotionAccount(t: AnyTestConvex, userId: string, accessToken = "notion-token"): Promise<void> {
    ensureAuthComponentRegistered(t);
    const now = Date.now();
    await t.run(async (ctx) => {
        const { secretConfig } = await createAuth(ctx).$context;
        await ctx.runMutation(components.betterAuth.adapter.create, {
            input: {
                data: {
                    accessToken: await symmetricEncrypt({ data: accessToken, key: secretConfig }),
                    accountId: "notion-user",
                    createdAt: now,
                    providerId: "notion",
                    updatedAt: now,
                    userId,
                },
                model: "account",
            },
        });
    });
}

export interface RecordedRequest {
    body: string;
    headers: Headers;
    method: string;
    url: string;
}

export function stubHttp(respond: (request: RecordedRequest) => Response) {
    const requests: RecordedRequest[] = [];
    const client = HttpClient.make((request) =>
        Effect.gen(function* recordRequest() {
            const web = yield* HttpClientRequest.toWeb(request).pipe(Effect.orDie);
            const body = yield* Effect.promise(() => web.text());
            const recorded = { body, headers: web.headers, method: web.method, url: web.url };
            requests.push(recorded);
            return HttpClientResponse.fromWeb(request, respond(recorded));
        })
    );
    return { layer: Layer.succeed(HttpClient.HttpClient, client), requests };
}

export const silentHttp = Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.make(() => Effect.never)
);
