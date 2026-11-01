import { FunctionSpec, GroupSpec } from "@confect/core";
import * as Schema from "effect/Schema";

const NotionSource = Schema.Struct({
    columns: Schema.Array(Schema.String),
    id: Schema.String,
    ledger: Schema.Boolean,
    title: Schema.String,
});

const NotionTable = Schema.Struct({
    header: Schema.Array(Schema.String),
    rows: Schema.Array(Schema.Array(Schema.String)),
    title: Schema.String,
    truncated: Schema.Boolean,
});

export default GroupSpec.make()
    .addFunction(FunctionSpec.publicQuery({ name: "connected", args: () => ({}), returns: () => Schema.Boolean }))
    .addFunction(
        FunctionSpec.publicAction({
            name: "sources",
            args: () => ({}),
            returns: () =>
                Schema.Struct({ sources: Schema.Array(NotionSource), workspaceName: Schema.NullOr(Schema.String) }),
        })
    )
    .addFunction(
        FunctionSpec.publicAction({
            name: "tables",
            args: () => ({ ids: Schema.Array(Schema.String) }),
            returns: () => Schema.Array(NotionTable),
        })
    )
    .addFunction(FunctionSpec.publicAction({ name: "disconnect", args: () => ({}), returns: () => Schema.Null }))
    .addFunction(
        FunctionSpec.internalMutation({
            name: "forget",
            args: () => ({ userId: Schema.String }),
            returns: () => Schema.Null,
        })
    )
    .addFunction(
        FunctionSpec.internalAction({
            name: "revoke",
            args: () => ({ accessToken: Schema.String }),
            returns: () => Schema.Null,
        })
    );
