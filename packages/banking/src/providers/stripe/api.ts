import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as HttpClient from "effect/http/HttpClient";
import * as HttpClientRequest from "effect/http/HttpClientRequest";
import * as HttpIncomingMessage from "effect/http/HttpIncomingMessage";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";

import { BankingError } from "../../provider";

const STRIPE_API = "https://api.stripe.com/v1";
const STRIPE_VERSION = "2026-04-22.dahlia";
const TIMEOUT = Duration.seconds(15);
const REJECTED_STATUSES = new Set([400, 401, 403, 404]);

const AccountRefresh = Schema.Struct({
    id: Schema.String,
    status: Schema.Literals(["pending", "succeeded", "failed"]),
});

export const StripeAccount = Schema.Struct({
    authorization: Schema.optional(Schema.NullOr(Schema.String)),
    category: Schema.Literals(["cash", "credit", "investment", "other"]),
    display_name: Schema.NullOr(Schema.String),
    id: Schema.String,
    institution_name: Schema.String,
    last4: Schema.NullOr(Schema.String),
    status: Schema.Literals(["active", "inactive", "disconnected"]),
    subscriptions: Schema.optional(Schema.NullOr(Schema.Array(Schema.String))),
    transaction_refresh: Schema.NullOr(AccountRefresh),
});
export type StripeAccount = typeof StripeAccount.Type;

export const StripeTransaction = Schema.Struct({
    account: Schema.String,
    amount: Schema.Int,
    currency: Schema.String,
    description: Schema.String,
    id: Schema.String,
    status: Schema.Literals(["pending", "posted", "void"]),
    transacted_at: Schema.Int,
});
export type StripeTransaction = typeof StripeTransaction.Type;

export const StripeSession = Schema.Struct({
    account_holder: Schema.NullOr(Schema.Struct({ customer: Schema.optional(Schema.NullOr(Schema.String)) })),
    client_secret: Schema.NullOr(Schema.String),
    id: Schema.String,
});
export type StripeSession = typeof StripeSession.Type;

export const StripeEvent = Schema.Struct({
    data: Schema.Struct({ object: Schema.Unknown }),
    type: Schema.String,
});
export type StripeEvent = typeof StripeEvent.Type;

export const List = <A, I>(item: Schema.Codec<A, I>) =>
    Schema.Struct({ data: Schema.Array(item), has_more: Schema.Boolean });

export type StripeForm = readonly (readonly [string, string])[];

const failureReason = (status: number): BankingError["reason"] => {
    if (status === 429) {
        return "rateLimited";
    }
    return REJECTED_STATUSES.has(status) ? "rejected" : "transport";
};

const transport = (operation: string) => (cause: unknown) =>
    new BankingError({ cause, operation, provider: "stripe", reason: "transport" });

export interface CallOptions {
    readonly form?: StripeForm;
    readonly idempotencyKey?: string;
    readonly method?: "DELETE";
}

const requestFor = (url: string, { form, idempotencyKey, method }: CallOptions) => {
    if (method === "DELETE") {
        return HttpClientRequest.delete(url);
    }
    if (form === undefined) {
        return HttpClientRequest.get(url);
    }
    const post = HttpClientRequest.post(url).pipe(HttpClientRequest.bodyUrlParams(form));
    return idempotencyKey === undefined
        ? post
        : post.pipe(HttpClientRequest.setHeader("Idempotency-Key", idempotencyKey));
};

export const stripeCall = <A, I>(
    key: Redacted.Redacted,
    schema: Schema.Codec<A, I>,
    operation: string,
    path: string,
    options: CallOptions = {}
) => {
    const request = requestFor(`${STRIPE_API}${path}`, options);
    return Effect.gen(function* call() {
        const response = yield* HttpClient.execute(
            request.pipe(
                HttpClientRequest.bearerToken(Redacted.value(key)),
                HttpClientRequest.setHeader("Stripe-Version", STRIPE_VERSION)
            )
        );
        if (response.status < 200 || response.status >= 300) {
            return yield* new BankingError({
                operation,
                provider: "stripe",
                reason: failureReason(response.status),
                status: response.status,
            });
        }
        return yield* HttpIncomingMessage.schemaBodyJson(schema)(response);
    }).pipe(
        Effect.timeout(TIMEOUT),
        Effect.catchTags({
            HttpClientError: transport(operation),
            SchemaError: transport(operation),
            TimeoutError: transport(operation),
        })
    );
};

const PAGE_SIZE = "100";

// A page that claims more but gives no new id to continue from would stop early and lose rows.
export const listAll = Effect.fn("StripeBanking.listAll")(function* listAll<A extends { readonly id: string }, I>(
    key: Redacted.Redacted,
    item: Schema.Codec<A, I>,
    operation: string,
    path: string,
    query: StripeForm
) {
    const collected: A[] = [];
    let startingAfter: string | undefined;
    for (;;) {
        const params = new URLSearchParams();
        for (const [name, value] of query) {
            params.append(name, value);
        }
        params.set("limit", PAGE_SIZE);
        if (startingAfter !== undefined) {
            params.set("starting_after", startingAfter);
        }
        const page = yield* stripeCall(key, List(item), operation, `${path}?${params.toString()}`);
        collected.push(...page.data);
        if (!page.has_more) {
            return collected;
        }
        const last = page.data.at(-1)?.id;
        if (last === undefined || last === startingAfter) {
            return yield* new BankingError({ operation, provider: "stripe", reason: "transport" });
        }
        startingAfter = last;
    }
});
