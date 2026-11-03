import { FunctionSpec, GroupSpec } from "@confect/core";
import * as Schema from "effect/Schema";

export const readArgs = {
    aiConsent: Schema.optional(Schema.Number),
    language: Schema.optional(Schema.String),
    shareAnalytics: Schema.optional(Schema.Boolean),
    text: Schema.String,
};

export const NotificationKind = Schema.Literals(["purchase", "income", "declined", "other"]);

export const NotificationRead = Schema.Struct({
    amount: Schema.NullOr(Schema.Finite),
    currency: Schema.NullOr(Schema.String),
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
