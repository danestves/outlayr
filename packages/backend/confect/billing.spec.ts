import { FunctionSpec, GroupSpec } from "@confect/core";
import * as Schema from "effect/Schema";

import { ProState } from "./proTerm";

const Plan = Schema.Literals(["monthly", "annual", "lifetime"]);

export default GroupSpec.make()
    .addFunction(
        FunctionSpec.internalAction({
            name: "createCheckout",
            args: () => ({ country: Schema.NullOr(Schema.String), plan: Plan }),
            returns: () =>
                Schema.Union([
                    Schema.Struct({ kind: Schema.Literal("redirect"), url: Schema.String }),
                    Schema.Struct({ kind: Schema.Literals(["alreadyPro", "signedOut", "unavailable"]) }),
                ]),
        })
    )
    .addFunction(
        FunctionSpec.publicAction({
            name: "confirmCheckout",
            args: () => ({ sessionId: Schema.String }),
            returns: () => Schema.Literals(["unlocked", "unpaid", "unconfirmed"]),
        })
    )
    .addFunction(
        FunctionSpec.publicAction({
            name: "restore",
            args: () => ({}),
            returns: () => Schema.Literals(["restored", "nothing", "failed"]),
        })
    )
    .addFunction(
        FunctionSpec.publicAction({
            name: "openPortal",
            args: () => ({}),
            returns: () => Schema.NullOr(Schema.String),
        })
    )
    .addFunction(
        FunctionSpec.publicAction({
            name: "plan",
            args: () => ({}),
            returns: () =>
                Schema.NullOr(
                    Schema.Struct({
                        expiresAtMs: Schema.NullOr(Schema.Number),
                        payments: Schema.Array(
                            Schema.Struct({ amount: Schema.Number, atMs: Schema.Number, currency: Schema.String })
                        ),
                        plan: Schema.NullOr(Plan),
                        price: Schema.NullOr(Schema.Struct({ amount: Schema.Number, currency: Schema.String })),
                        state: ProState,
                        store: Schema.NullOr(Schema.String),
                        trialAvailable: Schema.Boolean,
                    })
                ),
        })
    );
