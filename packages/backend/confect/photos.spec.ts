import { FunctionSpec, GroupSpec } from "@confect/core";
import * as Schema from "effect/Schema";

const PhotoUrl = Schema.Struct({ key: Schema.String, url: Schema.String });

export default GroupSpec.make()
    .addFunction(
        FunctionSpec.publicMutation({
            name: "requestUpload",
            args: () => ({ name: Schema.String }),
            returns: () =>
                Schema.Struct({
                    key: Schema.String,
                    method: Schema.Literals(["POST", "PUT"]),
                    url: Schema.String,
                }),
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
            // A component storage id is not an app `_storage` id, so it cannot be typed as one.
            args: () => ({ key: Schema.String, storageId: Schema.optional(Schema.String) }),
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
        FunctionSpec.publicMutation({
            name: "readUrls",
            args: () => ({ keys: Schema.Array(Schema.String) }),
            returns: () => Schema.Array(PhotoUrl),
        })
    )
    .addFunction(
        FunctionSpec.publicMutation({
            name: "releaseUnreferenced",
            args: () => ({ key: Schema.String }),
            returns: () => Schema.Struct({ released: Schema.Boolean }),
        })
    );
