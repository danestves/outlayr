import { FunctionSpec, GroupSpec } from "@confect/core";
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";

import merchantKnowledge from "./_generated/tables/merchantKnowledge";
import { KnowledgeSource } from "./merchantKnowledge";

// Everything here stays internal: a public exact-key oracle over this shared table is a dictionary-enumeration
// surface (threat T5). Never add a listing, prefix or range read over `by_key`.

const knowledgeRecord = () =>
    Schema.Struct({ ...Struct.omit(merchantKnowledge.Fields.fields, ["expiresAt"]), source: KnowledgeSource });

export default GroupSpec.make()
    .addFunction(
        FunctionSpec.internalQuery({
            name: "lookup",
            args: () => ({ keys: Schema.Array(Schema.String), now: Schema.Number }),
            returns: () => Schema.NullOr(knowledgeRecord()),
        })
    )
    .addFunction(
        FunctionSpec.internalQuery({
            name: "lookupMany",
            args: () => ({ keyLists: Schema.Array(Schema.Array(Schema.String)), now: Schema.Number }),
            returns: () => Schema.Array(Schema.NullOr(knowledgeRecord())),
        })
    )
    .addFunction(
        FunctionSpec.internalMutation({
            name: "record",
            args: () => ({
                ...Struct.omit(merchantKnowledge.Fields.fields, ["expiresAt", "key"]),
                keys: Schema.Array(Schema.String),
                source: KnowledgeSource,
            }),
            returns: () => Schema.Null,
        })
    )
    .addFunction(
        FunctionSpec.internalMutation({
            name: "purge",
            args: () => ({ key: Schema.String }),
            returns: () => Schema.Null,
        })
    );
