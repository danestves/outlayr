import { ConvexFunctionDefinitions, RegisteredConvexFunction, type RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import groupLayer from "../../receiptScan.impl";

const forward = <Ctx, Args, Returns>(handler: (ctx: Ctx, args: Args) => Promise<Returns>) => (ctx: Ctx, args: Args) => handler(ctx, args);

const definitions = ConvexFunctionDefinitions.buildForGroup<typeof import("../../receiptScan.spec")["default"]>(databaseSchema, groupLayer);

export default {
["admit"]: RegisteredConvexFunction.register({ ...definitions["admit"], handler: forward(definitions["admit"].handler) }),
["scan"]: RegisteredConvexFunction.register({ ...definitions["scan"], handler: forward(definitions["scan"].handler) }),
} as RegisteredFunctions.RegisteredFunctionsForGroupSpec<typeof import("../../receiptScan.spec")["default"]>;
