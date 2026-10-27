import { FunctionSpec, GroupSpec } from "@confect/core";

import type {
    callerId,
    confirmUpload,
    mapStorageId,
    readUrls,
    recordPhotoSize,
    releaseUnreferenced,
    requestUpload,
} from "./photos";

export default GroupSpec.make()
    .addFunction(FunctionSpec.convexPublicMutation<typeof requestUpload>()("requestUpload"))
    .addFunction(FunctionSpec.convexInternalQuery<typeof callerId>()("callerId"))
    .addFunction(FunctionSpec.convexPublicAction<typeof confirmUpload>()("confirmUpload"))
    .addFunction(FunctionSpec.convexInternalMutation<typeof recordPhotoSize>()("recordPhotoSize"))
    .addFunction(FunctionSpec.convexInternalMutation<typeof mapStorageId>()("mapStorageId"))
    .addFunction(FunctionSpec.convexPublicMutation<typeof readUrls>()("readUrls"))
    .addFunction(FunctionSpec.convexPublicMutation<typeof releaseUnreferenced>()("releaseUnreferenced"));
