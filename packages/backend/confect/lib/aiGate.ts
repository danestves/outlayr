import { resolveTextModel } from "@outlayr/ai/model";
import type { Route } from "@outlayr/model-router/route";
import { AI_CONSENT_VERSION } from "@outlayr/money/contract";
import type { UserIdentity } from "convex/server";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import type { ActionCtx, MutationCtx, QueryCtx } from "../../convex/_generated/server";
import { isPro } from "../revenuecat";
import { traceModel } from "./aiTracing";
import { isGuest, liveIdentity } from "./auth";

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
    readonly route: Route;
    readonly sessionId?: string;
}

export const openAiGateFor = Effect.fn("AiGate.openFor")(function* openAiGateFor<Admitted, E, R>(
    ctx: Parameters<typeof isPro>[0],
    caller: UserIdentity,
    request: AiRequest<Admitted, E, R>
) {
    const resolved = yield* resolveTextModel(request.route);
    if (Option.isNone(resolved) || !hasAiConsent(request.args)) {
        return yield* refuse("notConfigured");
    }
    // Free AI is an account's allowance; a guest costs nothing to make, so only the purchase it holds opens AI.
    if (isGuest(caller) && !(yield* isPro(ctx, caller.subject))) {
        return yield* refuse("unauthenticated");
    }
    const admitted = yield* request.admit(caller);
    const distinctId = request.args.shareAnalytics === true ? caller.subject : undefined;
    return {
        admitted,
        caller,
        distinctId,
        model: traceModel(resolved.value, { distinctId, sessionId: request.sessionId }),
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
    return yield* openAiGateFor(ctx, caller, request);
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
