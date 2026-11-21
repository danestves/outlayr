import { ConvexFunctionDefinitions, RegisteredConvexFunction, type RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import groupLayer from "../../guests.impl";

const forward = <Ctx, Args, Returns>(handler: (ctx: Ctx, args: Args) => Promise<Returns>) => (ctx: Ctx, args: Args) => handler(ctx, args);

const definitions = ConvexFunctionDefinitions.buildForGroup<typeof import("../../guests.spec")["default"]>(databaseSchema, groupLayer);

export default {
["retire"]: RegisteredConvexFunction.register({ ...definitions["retire"], handler: forward(definitions["retire"].handler) }),
["forget"]: RegisteredConvexFunction.register({ ...definitions["forget"], handler: forward(definitions["forget"].handler) }),
} as RegisteredFunctions.RegisteredFunctionsForGroupSpec<typeof import("../../guests.spec")["default"]>;
