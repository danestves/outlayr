import { PRO_PLANS, stripeMajorUnits } from "@outlayr/money/pro-prices";
import type { ProPlan } from "@outlayr/money/pro-prices";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as HttpClient from "effect/http/HttpClient";
import * as HttpClientRequest from "effect/http/HttpClientRequest";
import * as HttpIncomingMessage from "effect/http/HttpIncomingMessage";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";

import { revenueCatStripePublicKey, stripeSecretKey } from "./lib/config";

const STRIPE_API = "https://api.stripe.com/v1";
const STRIPE_VERSION = "2026-04-22.dahlia";
const RECEIPTS_URL = "https://api.revenuecat.com/v1/receipts";
const TIMEOUT = Duration.seconds(15);
const TRIAL_DAYS = "7";
const PAYMENTS_SHOWN = 12;

export class StripeError extends Schema.TaggedError<StripeError>()("StripeError", {
    cause: Schema.optional(Schema.Defect()),
    path: Schema.String,
    reason: Schema.Literals(["unconfigured", "status", "transport"]),
    status: Schema.optional(Schema.Number),
}) {
    override get message(): string {
        return `Stripe ${this.path} failed: ${this.reason}${this.status === undefined ? "" : ` ${this.status}`}`;
    }
}

const transport = (path: string) => (cause: unknown) => new StripeError({ cause, path, reason: "transport" });

const stripeCall = <A, I>(schema: Schema.Codec<A, I>, path: string, form?: Readonly<Record<string, string>>) =>
    Effect.fn("Stripe.call")(
        function* call() {
            const key = yield* stripeSecretKey;
            if (Option.isNone(key)) {
                return yield* new StripeError({ path, reason: "unconfigured" });
            }
            const url = `${STRIPE_API}${path}`;
            const response = yield* HttpClient.execute(
                (form
                    ? HttpClientRequest.post(url).pipe(HttpClientRequest.bodyUrlParams(form))
                    : HttpClientRequest.get(url)
                ).pipe(
                    HttpClientRequest.bearerToken(Redacted.value(key.value)),
                    HttpClientRequest.setHeader("Stripe-Version", STRIPE_VERSION)
                )
            );
            if (response.status < 200 || response.status >= 300) {
                return yield* new StripeError({ path, reason: "status", status: response.status });
            }
            return yield* HttpIncomingMessage.schemaBodyJson(schema)(response);
        },
        Effect.timeout(TIMEOUT),
        Effect.catchTags({
            HttpClientError: transport(path),
            SchemaError: transport(path),
            TimeoutError: transport(path),
        })
    )();

const List = <A, I>(item: Schema.Codec<A, I>) => Schema.Struct({ data: Schema.Array(item) });
const WithId = Schema.Struct({ id: Schema.String });

const quoted = (value: string) => value.replaceAll("\\", "\\\\").replaceAll("'", "\\'");

export const findCustomer = Effect.fn("Stripe.findCustomer")(function* findCustomer(appUserId: string) {
    const query = encodeURIComponent(`metadata['app_user_id']:'${quoted(appUserId)}'`);
    const { data } = yield* stripeCall(List(WithId), `/customers/search?query=${query}`);
    return data[0]?.id ?? null;
});

export interface BillingUser {
    readonly email: string;
    readonly id: string;
    readonly name: string;
}

export const ensureCustomer = Effect.fn("Stripe.ensureCustomer")(function* ensureCustomer(user: BillingUser) {
    const found = yield* findCustomer(user.id);
    if (found !== null) {
        return found;
    }
    const { id } = yield* stripeCall(WithId, "/customers", {
        email: user.email,
        "metadata[app_user_id]": user.id,
        name: user.name,
    });
    return id;
});

export const priceIdForKey = Effect.fn("Stripe.priceIdForKey")(function* priceIdForKey(key: string) {
    const { data } = yield* stripeCall(
        List(WithId),
        `/prices?active=true&limit=1&lookup_keys[]=${encodeURIComponent(key)}`
    );
    return data[0]?.id ?? null;
});

export interface CheckoutInput {
    readonly appUserId: string;
    readonly customerId: string;
    readonly plan: ProPlan;
    readonly priceId: string;
    readonly siteUrl: string;
    readonly trial: boolean;
}
export function checkoutForm(input: CheckoutInput) {
    const shared = {
        cancel_url: input.siteUrl,
        customer: input.customerId,
        "line_items[0][price]": input.priceId,
        "line_items[0][quantity]": "1",
        "managed_payments[enabled]": "true",
        "metadata[app_user_id]": input.appUserId,
        success_url: `${input.siteUrl}/?checkout={CHECKOUT_SESSION_ID}`,
    };
    if (input.plan === "lifetime") {
        return { ...shared, mode: "payment" };
    }
    const subscription = {
        ...shared,
        mode: "subscription",
        "subscription_data[metadata][app_user_id]": input.appUserId,
    };
    return input.trial && input.plan === "annual"
        ? { ...subscription, "subscription_data[trial_period_days]": TRIAL_DAYS }
        : subscription;
}

export const createCheckoutSession = Effect.fn("Stripe.createCheckoutSession")(function* createCheckoutSession(
    input: CheckoutInput
) {
    const { url } = yield* stripeCall(Schema.Struct({ url: Schema.String }), "/checkout/sessions", checkoutForm(input));
    return url;
});

const CheckoutSession = Schema.Struct({
    id: Schema.String,
    metadata: Schema.NullOr(Schema.Record(Schema.String, Schema.String)),
    status: Schema.NullOr(Schema.String),
});

export const paidSession = Effect.fn("Stripe.paidSession")(function* paidSession(id: string, appUserId: string) {
    const session = yield* stripeCall(CheckoutSession, `/checkout/sessions/${encodeURIComponent(id)}`);
    return session.status === "complete" && session.metadata?.app_user_id === appUserId;
});

export const paidSessionIds = Effect.fn("Stripe.paidSessionIds")(function* paidSessionIds(customerId: string) {
    const { data } = yield* stripeCall(
        List(CheckoutSession),
        `/checkout/sessions?status=complete&limit=20&customer=${encodeURIComponent(customerId)}`
    );
    return data.map((session) => session.id);
});

export const postReceipt = Effect.fn("Stripe.postReceipt")(function* postReceipt(appUserId: string, sessionId: string) {
    const path = "revenuecat receipts";
    const key = yield* revenueCatStripePublicKey;
    if (Option.isNone(key)) {
        return yield* new StripeError({ path, reason: "unconfigured" });
    }
    const response = yield* HttpClient.execute(
        HttpClientRequest.post(RECEIPTS_URL).pipe(
            HttpClientRequest.bearerToken(Redacted.value(key.value)),
            HttpClientRequest.setHeader("X-Platform", "stripe"),
            HttpClientRequest.bodyJsonUnsafe({ app_user_id: appUserId, fetch_token: sessionId })
        )
    ).pipe(
        Effect.timeout(TIMEOUT),
        Effect.catchTags({ HttpClientError: transport(path), TimeoutError: transport(path) })
    );
    if (response.status < 200 || response.status >= 300) {
        return yield* new StripeError({ path, reason: "status", status: response.status });
    }
});

export const portalUrl = Effect.fn("Stripe.portalUrl")(function* portalUrl(customerId: string, siteUrl: string) {
    const { url } = yield* stripeCall(Schema.Struct({ url: Schema.String }), "/billing_portal/sessions", {
        customer: customerId,
        return_url: `${siteUrl}/settings/plan`,
    });
    return url;
});

const LOOKUP_KEY_PLAN = /^pro_(monthly|annual|lifetime)_/u;

export const catalogPrice = Effect.fn("Stripe.catalogPrice")(function* catalogPrice(priceId: string) {
    const price = yield* stripeCall(
        Schema.Struct({
            currency: Schema.String,
            lookup_key: Schema.NullOr(Schema.String),
            unit_amount: Schema.NullOr(Schema.Number),
        }),
        `/prices/${encodeURIComponent(priceId)}`
    );
    const planKey = price.lookup_key?.match(LOOKUP_KEY_PLAN)?.[1];
    const currency = price.currency.toUpperCase();
    return {
        plan: PRO_PLANS.find((plan) => plan === planKey) ?? null,
        price: price.unit_amount === null ? null : { amount: stripeMajorUnits(price.unit_amount, currency), currency },
    };
});

const Charge = Schema.Struct({
    amount: Schema.Number,
    created: Schema.Number,
    currency: Schema.String,
    status: Schema.String,
});
const Invoice = Schema.Struct({ created: Schema.Number, currency: Schema.String, total: Schema.Number });

const paymentOf = (amount: number, created: number, rawCurrency: string) => {
    const currency = rawCurrency.toUpperCase();
    return { amount: stripeMajorUnits(amount, currency), atMs: created * 1000, currency };
};

export const recentPayments = Effect.fn("Stripe.recentPayments")(function* recentPayments(customerId: string) {
    const customer = encodeURIComponent(customerId);
    const { data: invoices } = yield* stripeCall(
        List(Invoice),
        `/invoices?status=paid&limit=${PAYMENTS_SHOWN}&customer=${customer}`
    );
    if (invoices.length > 0) {
        return invoices.map((invoice) => paymentOf(invoice.total, invoice.created, invoice.currency));
    }
    const { data: charges } = yield* stripeCall(List(Charge), `/charges?limit=${PAYMENTS_SHOWN}&customer=${customer}`);
    return charges
        .filter((charge) => charge.status === "succeeded")
        .map((charge) => paymentOf(charge.amount, charge.created, charge.currency));
});

export const eraseStripeCustomer = Effect.fn("Stripe.eraseStripeCustomer")(function* eraseStripeCustomer(
    appUserId: string
) {
    const key = yield* stripeSecretKey;
    if (Option.isNone(key)) {
        return;
    }
    const customerId = yield* findCustomer(appUserId);
    if (customerId === null) {
        return;
    }
    const path = `/customers/${customerId}`;
    const response = yield* HttpClient.execute(
        HttpClientRequest.delete(`${STRIPE_API}${path}`).pipe(HttpClientRequest.bearerToken(Redacted.value(key.value)))
    ).pipe(
        Effect.timeout(TIMEOUT),
        Effect.catchTags({ HttpClientError: transport(path), TimeoutError: transport(path) })
    );
    if ((response.status < 200 || response.status >= 300) && response.status !== 404) {
        return yield* new StripeError({ path, reason: "status", status: response.status });
    }
});
