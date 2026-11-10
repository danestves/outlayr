import { createAnthropic } from "@ai-sdk/anthropic";
import { AI_CONSENT_VERSION } from "@outlayr/money/contract";
import type { UserIdentity } from "convex/server";
import type * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";

import type { ActionCtx, MutationCtx, QueryCtx } from "../../convex/_generated/server";
import { isPro } from "../revenuecat";
import { traced } from "./aiTracing";
import { liveIdentity } from "./auth";
import { anthropicApiKey } from "./config";

export const AiRefusal = Schema.Literals([
    "unauthenticated",
    "notConfigured",
    "invalid",
    "notEntitled",
    "quotaExceeded",
    "rateLimited",
]);

export type AiRefusal = typeof AiRefusal.Type;

export class AiRefused<out Status extends AiRefusal = AiRefusal> extends Schema.TaggedError<AiRefused>()("AiRefused", {
    status: AiRefusal,
}) {
    declare readonly status: Status;
}

export const refuse = <const Status extends AiRefusal>(status: Status) =>
    Effect.fail(new AiRefused<Status>({ status }));

interface AiArgs {
    readonly aiConsent?: number | undefined;
    readonly shareAnalytics?: boolean | undefined;
}

export const hasAiConsent = (args: Pick<AiArgs, "aiConsent">) => args.aiConsent === AI_CONSENT_VERSION;

export interface AiRequest<Admitted, E, R> {
    readonly admit: (caller: UserIdentity) => Effect.Effect<Admitted, E, R>;
    readonly args: AiArgs;
    readonly feature: string;
    readonly modelId: Config.Config<string>;
    readonly sessionId?: string;
}

export const openAiGateFor = Effect.fn("AiGate.openFor")(function* openAiGateFor<Admitted, E, R>(
    caller: UserIdentity,
    request: AiRequest<Admitted, E, R>
) {
    const apiKey = yield* anthropicApiKey;
    if (Option.isNone(apiKey) || !hasAiConsent(request.args)) {
        return yield* refuse("notConfigured");
    }
    const admitted = yield* request.admit(caller);
    const modelId = yield* request.modelId;
    const distinctId = request.args.shareAnalytics === true ? caller.subject : undefined;
    return {
        admitted,
        caller,
        distinctId,
        model: traced(createAnthropic({ apiKey: Redacted.value(apiKey.value) })(modelId), request.feature, {
            distinctId,
            sessionId: request.sessionId,
        }),
    };
});

export const openAiGate = Effect.fn("AiGate.open")(function* openAiGate<Admitted, E, R>(
    ctx: ActionCtx | MutationCtx | QueryCtx,
    request: AiRequest<Admitted, E, R>
) {
    const caller = yield* liveIdentity(ctx);
    if (caller === null) {
        return yield* refuse("unauthenticated");
    }
    return yield* openAiGateFor(caller, request);
});

export const proOnly = Effect.fn("AiGate.proOnly")(function* proOnly(
    ctx: Parameters<typeof isPro>[0],
    caller: Pick<UserIdentity, "subject">
) {
    if (!(yield* isPro(ctx, caller.subject))) {
        return yield* refuse("notEntitled");
    }
});

export const withinLimit = Effect.fn("AiGate.withinLimit")(function* withinLimit(
    take: () => Promise<{ readonly ok: boolean }>
) {
    const taken = yield* Effect.promise(take);
    if (!taken.ok) {
        return yield* refuse("rateLimited");
    }
});
