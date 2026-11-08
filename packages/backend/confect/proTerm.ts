import { PRO_ENTITLEMENT_ID } from "@outlayr/money/contract";
import type { ProPlan } from "@outlayr/money/pro-prices";
import * as Schema from "effect/Schema";

const Dated = Schema.optional(Schema.NullOr(Schema.String));

const Subscriber = Schema.Struct({
    entitlements: Schema.optional(
        Schema.Record(
            Schema.String,
            Schema.Struct({
                expires_date: Dated,
                grace_period_expires_date: Dated,
                product_identifier: Schema.optional(Schema.String),
            })
        )
    ),
    non_subscriptions: Schema.optional(
        Schema.Record(Schema.String, Schema.Array(Schema.Struct({ store: Schema.optional(Schema.String) })))
    ),
    subscriptions: Schema.optional(
        Schema.Record(
            Schema.String,
            Schema.Struct({
                period_type: Schema.optional(Schema.String),
                price: Schema.optional(
                    Schema.NullOr(Schema.Struct({ amount: Schema.Number, currency: Schema.String }))
                ),
                store: Schema.optional(Schema.String),
                unsubscribe_detected_at: Dated,
            })
        )
    ),
});

export const decodeProSubscriber = Schema.decodeUnknownOption(Subscriber);

export const ProState = Schema.Literals(["none", "ended", "renews", "trial", "ends", "lifetime"]);

export const ProTerm = Schema.Struct({
    expiresAtMs: Schema.NullOr(Schema.Number),
    price: Schema.NullOr(Schema.Struct({ amount: Schema.Number, currency: Schema.String })),
    productId: Schema.NullOr(Schema.String),
    state: ProState,
    store: Schema.NullOr(Schema.String),
});
export type ProTerm = typeof ProTerm.Type;

const NO_PRO: ProTerm = { expiresAtMs: null, price: null, productId: null, state: "none", store: null };

const msOf = (date: string | null | undefined) => (date ? Date.parse(date) : null);
export function proTermOf(subscriber: typeof Subscriber.Type, nowMs: number): ProTerm {
    const entitlement = subscriber?.entitlements?.[PRO_ENTITLEMENT_ID];
    if (!entitlement) {
        return NO_PRO;
    }
    const productId = entitlement.product_identifier ?? null;
    const subscription = productId === null ? undefined : subscriber.subscriptions?.[productId];
    const purchase = productId === null ? undefined : subscriber.non_subscriptions?.[productId]?.at(-1);
    const expiresAtMs = msOf(entitlement.expires_date);
    const heldUntil = msOf(entitlement.grace_period_expires_date) ?? expiresAtMs;
    const held = {
        expiresAtMs,
        price: subscription?.price ?? null,
        productId,
        store: subscription?.store ?? purchase?.store ?? null,
    };
    if (expiresAtMs === null) {
        return { ...held, state: "lifetime" };
    }
    if (heldUntil !== null && heldUntil <= nowMs) {
        return { ...held, state: "ended" };
    }
    if (subscription?.unsubscribe_detected_at) {
        return { ...held, state: "ends" };
    }
    return { ...held, state: subscription?.period_type === "trial" ? "trial" : "renews" };
}

const STORE_PLAN = /(monthly|annual|yearly|lifetime)/u;
export function planOfStoreProduct(productId: string | null): ProPlan | null {
    const plan = productId?.match(STORE_PLAN)?.[1];
    if (plan === "yearly") {
        return "annual";
    }
    return plan === "monthly" || plan === "annual" || plan === "lifetime" ? plan : null;
}
