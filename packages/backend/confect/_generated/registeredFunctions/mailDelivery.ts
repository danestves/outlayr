import { ConvexFunctionDefinitions, RegisteredConvexFunction, type RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import groupLayer from "../../mailDelivery.impl";

const forward = <Ctx, Args, Returns>(handler: (ctx: Ctx, args: Args) => Promise<Returns>) => (ctx: Ctx, args: Args) => handler(ctx, args);

const definitions = ConvexFunctionDefinitions.buildForGroup<typeof import("../../mailDelivery.spec")["default"]>(databaseSchema, groupLayer);

export default {
["sendWelcome"]: RegisteredConvexFunction.register({ ...definitions["sendWelcome"], handler: forward(definitions["sendWelcome"].handler) }),
["sendPro"]: RegisteredConvexFunction.register({ ...definitions["sendPro"], handler: forward(definitions["sendPro"].handler) }),
["notifyPolicy"]: RegisteredConvexFunction.register({ ...definitions["notifyPolicy"], handler: forward(definitions["notifyPolicy"].handler) }),
} as RegisteredFunctions.RegisteredFunctionsForGroupSpec<typeof import("../../mailDelivery.spec")["default"]>;
