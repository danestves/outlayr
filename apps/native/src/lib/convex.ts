import { Suggestion } from "@outlayr/backend/confect/enrichment.spec";
import { api } from "@outlayr/backend/convex/_generated/api";
import { getFunctionName, makeFunctionReference } from "convex/server";
import type { DefaultFunctionArgs, FunctionReference, FunctionReturnType, OptionalRestArgs } from "convex/server";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { useSyncExternalStore } from "react";

import { AI_CONSENT_VERSION } from "@/domain/ai-consent";
import type { RemoteEnrichmentResult } from "@/domain/enrichment-cache";

import { CloudError } from "./cloud-error";
import { cloudRuntime } from "./cloud-runtime";
import type { CloudRuntime } from "./cloud-runtime";
import { posthog } from "./posthog";

export const convex = cloudRuntime?.convex ?? null;

let authenticated = false;
const authListeners = new Set<() => void>();

export function setCloudAuthenticated(next: boolean): void {
    if (next === authenticated) {
        return;
    }
    authenticated = next;
    for (const listener of authListeners) {
        listener();
    }
}

export function isCloudAuthenticated(): boolean {
    return authenticated;
}

function subscribeCloudAuthenticated(listener: () => void): () => void {
    authListeners.add(listener);
    return () => {
        authListeners.delete(listener);
    };
}

export function useCloudAuthenticated(): boolean {
    return useSyncExternalStore(subscribeCloudAuthenticated, isCloudAuthenticated, isCloudAuthenticated);
}

function cloudClient(): CloudRuntime["convex"] {
    if (cloudRuntime === null) {
        throw new Error("Cloud runtime is not configured");
    }
    return cloudRuntime.convex;
}

function callCloud<Result>(
    kind: "query" | "mutation" | "action",
    path: string,
    run: (client: CloudRuntime["convex"]) => Promise<Result>
) {
    return Effect.tryPromise({
        catch: (cause) => new CloudError({ cause, kind, path }),
        try: () => run(cloudClient()),
    }).pipe(Effect.withSpan("Cloud.call", { attributes: { kind, path } }));
}

const isFunctionPath = Schema.is(Schema.String);

export function cloudQuery<Args, Result>(path: string, args: Args): Effect.Effect<Result, CloudError>;
export function cloudQuery<Query extends FunctionReference<"query">>(
    query: Query,
    ...args: OptionalRestArgs<Query>
): Effect.Effect<FunctionReturnType<Query>, CloudError>;
export function cloudQuery(
    query: FunctionReference<"query"> | string,
    args?: DefaultFunctionArgs
): Effect.Effect<unknown, CloudError> {
    const reference = isFunctionPath(query) ? makeFunctionReference<"query">(query) : query;
    return callCloud("query", getFunctionName(reference), (client) => client.query(reference, args));
}

export function cloudMutation<Args, Result>(path: string, args: Args): Effect.Effect<Result, CloudError>;
export function cloudMutation<Mutation extends FunctionReference<"mutation">>(
    mutation: Mutation,
    ...args: OptionalRestArgs<Mutation>
): Effect.Effect<FunctionReturnType<Mutation>, CloudError>;
export function cloudMutation(
    mutation: FunctionReference<"mutation"> | string,
    args?: DefaultFunctionArgs
): Effect.Effect<unknown, CloudError> {
    const reference = isFunctionPath(mutation) ? makeFunctionReference<"mutation">(mutation) : mutation;
    return callCloud("mutation", getFunctionName(reference), (client) => client.mutation(reference, args));
}

export function cloudAction<Args, Result>(path: string, args: Args): Effect.Effect<Result, CloudError>;
export function cloudAction<Action extends FunctionReference<"action">>(
    action: Action,
    ...args: OptionalRestArgs<Action>
): Effect.Effect<FunctionReturnType<Action>, CloudError>;
export function cloudAction(
    action: FunctionReference<"action"> | string,
    args?: DefaultFunctionArgs
): Effect.Effect<unknown, CloudError> {
    const reference = isFunctionPath(action) ? makeFunctionReference<"action">(action) : action;
    return callCloud("action", getFunctionName(reference), (client) => client.action(reference, args));
}

export function aiConsentArgs() {
    return { aiConsent: AI_CONSENT_VERSION, shareAnalytics: posthog?.optedOut === false };
}

export interface CategoryBranch {
    children: string[];
    name: string;
}

export interface EnrichmentRequest {
    background?: boolean;
    categoryTree: CategoryBranch[];
    currency?: string;
    groundedLookup: boolean;
    income: boolean;
    knowledgeOnly?: boolean;
    locale?: string;
    name: string;
    regionCode?: string;
}

export type EnrichmentFn = (args: EnrichmentRequest) => Effect.Effect<RemoteEnrichmentResult, CloudError>;

const decodeSuggestion = Schema.decodeUnknownEffect(Suggestion);

/** Names only: `packages/backend/confect/enrichment.test.ts` asserts the action's validator against this field set. */
export function enrichmentTransport(): EnrichmentFn | null {
    if (!authenticated) {
        return null;
    }
    const { suggest } = api.enrichment;
    return (args) =>
        cloudAction(suggest, { ...args, ...aiConsentArgs() }).pipe(
            Effect.flatMap(decodeSuggestion),
            Effect.catchTags({
                SchemaError: (cause) =>
                    Effect.fail(new CloudError({ cause, kind: "action", path: getFunctionName(suggest) })),
            })
        );
}
