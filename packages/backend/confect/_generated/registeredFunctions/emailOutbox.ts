import { ConvexFunctionDefinitions, RegisteredConvexFunction, type RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import groupLayer from "../../emailOutbox.impl";

const forward = <Ctx, Args, Returns>(handler: (ctx: Ctx, args: Args) => Promise<Returns>) => (ctx: Ctx, args: Args) => handler(ctx, args);

const definitions = ConvexFunctionDefinitions.buildForGroup<typeof import("../../emailOutbox.spec")["default"]>(databaseSchema, groupLayer);

export default {
["enqueue"]: RegisteredConvexFunction.register({ ...definitions["enqueue"], handler: forward(definitions["enqueue"].handler) }),
["email"]: RegisteredConvexFunction.register({ ...definitions["email"], handler: forward(definitions["email"].handler) }),
["settled"]: definitions["settled"].handler,
} as RegisteredFunctions.RegisteredFunctionsForGroupSpec<typeof import("../../emailOutbox.spec")["default"]>;
