import { ConvexFunctionDefinitions, RegisteredConvexFunction, type RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import groupLayer from "../../notion.impl";

const forward = <Ctx, Args, Returns>(handler: (ctx: Ctx, args: Args) => Promise<Returns>) => (ctx: Ctx, args: Args) => handler(ctx, args);

const definitions = ConvexFunctionDefinitions.buildForGroup<typeof import("../../notion.spec")["default"]>(databaseSchema, groupLayer);

export default {
["connected"]: RegisteredConvexFunction.register({ ...definitions["connected"], handler: forward(definitions["connected"].handler) }),
["sources"]: RegisteredConvexFunction.register({ ...definitions["sources"], handler: forward(definitions["sources"].handler) }),
["tables"]: RegisteredConvexFunction.register({ ...definitions["tables"], handler: forward(definitions["tables"].handler) }),
["disconnect"]: RegisteredConvexFunction.register({ ...definitions["disconnect"], handler: forward(definitions["disconnect"].handler) }),
["forget"]: RegisteredConvexFunction.register({ ...definitions["forget"], handler: forward(definitions["forget"].handler) }),
["revoke"]: RegisteredConvexFunction.register({ ...definitions["revoke"], handler: forward(definitions["revoke"].handler) }),
} as RegisteredFunctions.RegisteredFunctionsForGroupSpec<typeof import("../../notion.spec")["default"]>;
