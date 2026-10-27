import { FunctionImpl, GroupImpl } from "@confect/server";
import * as Layer from "effect/Layer";

import databaseSchema from "./_generated/schema";
import {
    callerId,
    confirmUpload,
    mapStorageId,
    readUrls,
    recordPhotoSize,
    releaseUnreferenced,
    requestUpload,
} from "./photos";
import spec from "./photos.spec";

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "requestUpload", requestUpload)),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "callerId", callerId)),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "confirmUpload", confirmUpload)),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "recordPhotoSize", recordPhotoSize)),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "mapStorageId", mapStorageId)),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "readUrls", readUrls)),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "releaseUnreferenced", releaseUnreferenced)),
    GroupImpl.finalize
);
