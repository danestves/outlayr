import { ConvexFunctionDefinitions, RegisteredConvexFunction, type RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import groupLayer from "../../pdfImport.impl";

const forward = <Ctx, Args, Returns>(handler: (ctx: Ctx, args: Args) => Promise<Returns>) => (ctx: Ctx, args: Args) => handler(ctx, args);

const definitions = ConvexFunctionDefinitions.buildForGroup<typeof import("../../pdfImport.spec")["default"]>(databaseSchema, groupLayer);

export default {
["requestUpload"]: RegisteredConvexFunction.register({ ...definitions["requestUpload"], handler: forward(definitions["requestUpload"].handler) }),
["uploadContentType"]: RegisteredConvexFunction.register({ ...definitions["uploadContentType"], handler: forward(definitions["uploadContentType"].handler) }),
["sweepUploads"]: RegisteredConvexFunction.register({ ...definitions["sweepUploads"], handler: forward(definitions["sweepUploads"].handler) }),
["extract"]: RegisteredConvexFunction.register({ ...definitions["extract"], handler: forward(definitions["extract"].handler) }),
} as RegisteredFunctions.RegisteredFunctionsForGroupSpec<typeof import("../../pdfImport.spec")["default"]>;
