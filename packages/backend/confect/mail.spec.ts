import { FunctionSpec, GroupSpec } from "@confect/core";
import { LANGUAGES } from "@outlayr/email/language";
import * as Schema from "effect/Schema";

const Language = Schema.Literals(LANGUAGES);

const UserLanguage = () => ({ language: Language, userId: Schema.String });

const Store = Schema.Literals([
    "AMAZON",
    "APP_STORE",
    "MAC_APP_STORE",
    "GALAXY",
    "PADDLE",
    "PLAY_STORE",
    "PROMOTIONAL",
    "RC_BILLING",
    "ROKU",
    "STRIPE",
    "TEST_STORE",
    "EXTERNAL",
    "UNKNOWN_STORE",
]);

export const Entitlement = {
    expiresAtMs: Schema.optional(Schema.Number),
    productId: Schema.optional(Schema.String),
    store: Schema.optional(Store),
};

const Recipient = Schema.Struct({ email: Schema.String, language: Language, userId: Schema.String });

export default GroupSpec.make()
    .addFunction(
        FunctionSpec.internalMutation({ name: "claimWelcome", args: UserLanguage, returns: () => Schema.Null })
    )
    .addFunction(
        FunctionSpec.internalMutation({ name: "rememberLanguage", args: UserLanguage, returns: () => Schema.Null })
    )
    .addFunction(
        FunctionSpec.internalQuery({
            name: "welcomeRecipient",
            args: () => ({ userId: Schema.String }),
            returns: () =>
                Schema.NullOr(
                    Schema.Struct({
                        email: Schema.String,
                        language: Language,
                        provider: Schema.Literals(["apple", "email", "google"]),
                    })
                ),
        })
    )

    .addFunction(
        FunctionSpec.internalMutation({
            name: "claimPro",
            args: () => ({
                ...Entitlement,
                appUserId: Schema.String,
                entitlementId: Schema.String,
                isSandbox: Schema.Boolean,
                ownershipType: Schema.optional(Schema.Literals(["PURCHASED", "FAMILY_SHARED", "UNKNOWN"])),
                purchasedAtMs: Schema.optional(Schema.Number),
                sourceEventType: Schema.String,
            }),
            returns: () => Schema.Null,
        })
    )
    .addFunction(
        FunctionSpec.internalQuery({
            name: "recipient",
            args: () => ({ userId: Schema.String }),
            returns: () => Schema.NullOr(Recipient),
        })
    )

    .addFunction(
        FunctionSpec.internalQuery({
            name: "noticeRecipients",
            args: () => ({ cursor: Schema.NullOr(Schema.String), keys: Schema.Array(Schema.String) }),
            returns: () =>
                Schema.Struct({
                    continueCursor: Schema.String,
                    isDone: Schema.Boolean,
                    recipients: Schema.Array(
                        Schema.Struct({ ...Recipient.fields, pending: Schema.Array(Schema.String) })
                    ),
                }),
        })
    )
    .addFunction(
        FunctionSpec.internalMutation({
            name: "recordNotice",
            args: () => ({ keys: Schema.Array(Schema.String), language: Language, userId: Schema.String }),
            returns: () => Schema.Null,
        })
    );
