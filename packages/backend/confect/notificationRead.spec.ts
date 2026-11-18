import { FunctionSpec, GroupSpec } from "@confect/core";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

export const readArgs = {
    aiConsent: Schema.optional(Schema.Number),
    language: Schema.optional(Schema.String),
    shareAnalytics: Schema.optional(Schema.Boolean),
    text: Schema.String,
};

export const NotificationKind = Schema.Literals(["purchase", "income", "declined", "debt", "other"]);

export const DebtVerb = Schema.Literals(["borrowed", "gotPaidBack", "lent", "paidBack"]);

export type DebtVerb = typeof DebtVerb.Type;

export const DebtInstallment = Schema.Struct({ number: Schema.Int, of: Schema.NullOr(Schema.Int) });

export type DebtInstallment = typeof DebtInstallment.Type;

export const DebtRead = Schema.Struct({ installment: Schema.NullOr(DebtInstallment), verb: DebtVerb });

export type DebtRead = typeof DebtRead.Type;

export const NotificationRead = Schema.Struct({
    amount: Schema.NullOr(Schema.Finite),
    currency: Schema.NullOr(Schema.String),
    debt: Schema.NullOr(DebtRead).pipe(Schema.withDecodingDefault(Effect.succeed(null))),
    kind: NotificationKind,
    merchant: Schema.NullOr(Schema.String),
});

export type NotificationRead = typeof NotificationRead.Type;

export const ReadStatus = Schema.Literals([
    "ok",
    "unauthenticated",
    "notConfigured",
    "rateLimited",
    "invalid",
    "providerError",
    "invalidResponse",
]);

export type ReadStatus = typeof ReadStatus.Type;

export const ReadResult = Schema.Struct({
    read: Schema.NullOr(NotificationRead),
    status: ReadStatus,
});

export type ReadResult = typeof ReadResult.Type;

export default GroupSpec.make().addFunction(
    FunctionSpec.publicAction({ args: () => readArgs, name: "read", returns: () => ReadResult })
);
