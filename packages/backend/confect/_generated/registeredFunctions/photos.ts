import { ConvexFunctionDefinitions, RegisteredConvexFunction, type RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import groupLayer from "../../photos.impl";

const forward = <Ctx, Args, Returns>(handler: (ctx: Ctx, args: Args) => Promise<Returns>) => (ctx: Ctx, args: Args) => handler(ctx, args);

const definitions = ConvexFunctionDefinitions.buildForGroup<typeof import("../../photos.spec")["default"]>(databaseSchema, groupLayer);

export default {
["requestUpload"]: RegisteredConvexFunction.register({ ...definitions["requestUpload"], handler: forward(definitions["requestUpload"].handler) }),
["callerId"]: RegisteredConvexFunction.register({ ...definitions["callerId"], handler: forward(definitions["callerId"].handler) }),
["confirmUpload"]: RegisteredConvexFunction.register({ ...definitions["confirmUpload"], handler: forward(definitions["confirmUpload"].handler) }),
["recordPhotoSize"]: RegisteredConvexFunction.register({ ...definitions["recordPhotoSize"], handler: forward(definitions["recordPhotoSize"].handler) }),
["mapStorageId"]: RegisteredConvexFunction.register({ ...definitions["mapStorageId"], handler: forward(definitions["mapStorageId"].handler) }),
["readUrls"]: RegisteredConvexFunction.register({ ...definitions["readUrls"], handler: forward(definitions["readUrls"].handler) }),
["releaseUnreferenced"]: RegisteredConvexFunction.register({ ...definitions["releaseUnreferenced"], handler: forward(definitions["releaseUnreferenced"].handler) }),
} as RegisteredFunctions.RegisteredFunctionsForGroupSpec<typeof import("../../photos.spec")["default"]>;
