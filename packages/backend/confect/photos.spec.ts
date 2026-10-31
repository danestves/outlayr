import { FunctionSpec, GroupSpec } from "@confect/core";
import * as Schema from "effect/Schema";

import { Id } from "./_generated/id";
import { ProfileId } from "./sync";

const PhotoUrl = Schema.Struct({ key: Schema.String, url: Schema.String });

export default GroupSpec.make()
    .addFunction(
        FunctionSpec.publicMutation({
            name: "requestUpload",
            args: () => ({ name: Schema.String }),
            returns: () => PhotoUrl,
        })
    )
    .addFunction(
        FunctionSpec.internalQuery({
            name: "callerId",
            args: () => ({}),
            returns: () => Schema.String,
        })
    )
    .addFunction(
        FunctionSpec.publicAction({
            name: "confirmUpload",
            args: () => ({ key: Schema.String, storageId: Schema.optional(Id("_storage")) }),
            returns: () => Schema.Null,
        })
    )
    .addFunction(
        FunctionSpec.internalMutation({
            name: "recordPhotoSize",
            args: () => ({ bytes: Schema.Number, key: Schema.String }),
            returns: () => Schema.Null,
        })
    )
    .addFunction(
        FunctionSpec.internalMutation({
            name: "mapStorageId",
            args: () => ({ key: Schema.String, storageId: Id("_storage") }),
            returns: () => Schema.Null,
        })
    )
    .addFunction(
        FunctionSpec.publicMutation({
            name: "readUrls",
            args: () => ({ keys: Schema.Array(Schema.String) }),
            returns: () => Schema.Array(PhotoUrl),
        })
    )
    .addFunction(
        FunctionSpec.publicMutation({
            name: "releaseUnreferenced",
            args: () => ({ key: Schema.String, profileId: Schema.optional(ProfileId) }),
            returns: () => Schema.Struct({ released: Schema.Boolean }),
        })
    );
