import { ConvexFunctionDefinitions, RegisteredConvexFunction, type RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import groupLayer from "../../openStats.impl";

const forward = <Ctx, Args, Returns>(handler: (ctx: Ctx, args: Args) => Promise<Returns>) => (ctx: Ctx, args: Args) => handler(ctx, args);

const definitions = ConvexFunctionDefinitions.buildForGroup<typeof import("../../openStats.spec")["default"]>(databaseSchema, groupLayer);

export default {
["refresh"]: RegisteredConvexFunction.register({ ...definitions["refresh"], handler: forward(definitions["refresh"].handler) }),
["inputs"]: RegisteredConvexFunction.register({ ...definitions["inputs"], handler: forward(definitions["inputs"].handler) }),
["save"]: RegisteredConvexFunction.register({ ...definitions["save"], handler: forward(definitions["save"].handler) }),
["latest"]: RegisteredConvexFunction.register({ ...definitions["latest"], handler: forward(definitions["latest"].handler) }),
} as RegisteredFunctions.RegisteredFunctionsForGroupSpec<typeof import("../../openStats.spec")["default"]>;
