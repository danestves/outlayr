import { route } from "@outlayr/model-router/route";
import { knowledgeKeys } from "@outlayr/money/merchant-key";
import type { LanguageModel } from "ai";
import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import { internal } from "../convex/_generated/api";
import type { ActionCtx } from "../convex/_generated/server";
import type { EnrichmentJobsDoc } from "./_generated/docs";
import { CaptureRequest } from "./captureLookup.spec";
import { applyToTree, runSuggest } from "./enrichment";
import { share } from "./enrichmentQueue";
import { aiCredentials, languageModel } from "./lib/aiProvider";
import { traced } from "./lib/aiTracing";
import type { EnrichmentResult } from "./lib/enrichmentResult";
import { routedModelId } from "./lib/modelRoute";
import { sha256Hex } from "./lib/sha256Hex";

// Under the intent's 5s request timeout: a Wallet automation waits on this before its push goes out.
export const CAPTURE_TIMEOUT_MS = 3000;
const MAX_BODY_LENGTH = 32_000;
const BEARER = /^Bearer\s+(\S+)$/;
const CAPTURE_ROUTE = route({ feature: "category_suggest" });

type CaptureCtx = Pick<ActionCtx, "runMutation" | "runQuery" | "runAction" | "meta">;

export interface QuickAnswer {
    answer: typeof EnrichmentResult.Type | null;
    final: boolean;
}

const fastModel = Effect.fn("CaptureLookup.fastModel")(function* fastModel(row: EnrichmentJobsDoc) {
    const credentials = yield* aiCredentials;
    if (Option.isNone(credentials)) {
        return null;
    }
    const distinctId = row.shareAnalytics === true ? row.userId : undefined;
    return traced(languageModel(credentials.value, yield* routedModelId(CAPTURE_ROUTE)), CAPTURE_ROUTE, {
        distinctId,
    });
});

// The cache and the fast model only; a grounded job's fast answer is not final, so its web search still runs queued.
export const quickAnswer = Effect.fn("CaptureLookup.quickAnswer")(function* quickAnswer(
    ctx: CaptureCtx,
    row: EnrichmentJobsDoc,
    fast?: LanguageModel
) {
    const now = yield* Clock.currentTimeMillis;
    const cached = yield* Effect.promise(() =>
        ctx.runQuery(internal.merchantKnowledge.lookup, { keys: knowledgeKeys(row.name, row.currency), now })
    );
    if (cached !== null && (!row.grounded || (cached.source === "web" && cached.merchantName !== undefined))) {
        const hit: QuickAnswer = { answer: applyToTree(row.categoryTree, cached), final: true };
        return hit;
    }
    const model = fast ?? (yield* fastModel(row));
    const suggested =
        model === null
            ? null
            : yield* runSuggest(model, {
                  categoryTree: row.categoryTree,
                  currency: row.currency,
                  income: row.income,
                  locale: row.locale,
                  name: row.name,
                  regionCode: row.regionCode,
                  timeoutMs: CAPTURE_TIMEOUT_MS,
              }).pipe(Effect.catchTags({ ModelCallError: () => Effect.succeed(null) }));
    if (suggested === null) {
        const missed: QuickAnswer = {
            answer: cached === null ? null : applyToTree(row.categoryTree, cached),
            final: false,
        };
        return missed;
    }
    const { grounding: _grounding, ...answer } = suggested;
    if (row.grounded) {
        const partial: QuickAnswer = { answer, final: false };
        return partial;
    }
    const shared = yield* share(ctx, row, answer, yield* routedModelId(CAPTURE_ROUTE));
    const done: QuickAnswer = { answer: shared, final: true };
    return done;
});

const decodeRequest = Schema.decodeUnknownOption(Schema.fromJsonString(CaptureRequest));

const refuse = (status: 400 | 401 | 403) => Response.json({ refused: true }, { status });

export const captureEnrich = Effect.fn("CaptureLookup.enrich")(function* captureEnrich(
    ctx: CaptureCtx,
    request: Request,
    fast?: LanguageModel
) {
    const key = BEARER.exec(request.headers.get("Authorization") ?? "")?.[1];
    if (key === undefined) {
        return refuse(401);
    }
    const text = yield* Effect.promise(() => request.text());
    const body = text.length > MAX_BODY_LENGTH ? Option.none() : decodeRequest(text);
    if (Option.isNone(body)) {
        return refuse(400);
    }
    const keyHash = yield* sha256Hex(key);
    const opened = yield* Effect.promise(() =>
        ctx.runMutation(internal.captureLookup.open, { ...body.value, keyHash })
    );
    if (opened.kind === "unknownKey") {
        return refuse(401);
    }
    if (opened.kind === "refused") {
        return refuse(403);
    }
    const { answer, final } = yield* quickAnswer(ctx, opened.job, fast);
    yield* Effect.promise(() =>
        ctx.runMutation(internal.captureLookup.settle, { final, jobId: opened.job._id, result: answer })
    );
    return Response.json({ answer, queued: !final });
});
