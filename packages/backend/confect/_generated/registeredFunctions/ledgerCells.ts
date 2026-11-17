import { ConvexFunctionDefinitions, RegisteredConvexFunction, type RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import groupLayer from "../../ledgerCells.impl";

const forward = <Ctx, Args, Returns>(handler: (ctx: Ctx, args: Args) => Promise<Returns>) => (ctx: Ctx, args: Args) => handler(ctx, args);

const definitions = ConvexFunctionDefinitions.buildForGroup<typeof import("../../ledgerCells.spec")["default"]>(databaseSchema, groupLayer);

export default {
["refresh"]: RegisteredConvexFunction.register({ ...definitions["refresh"], handler: forward(definitions["refresh"].handler) }),
["rebuild"]: RegisteredConvexFunction.register({ ...definitions["rebuild"], handler: forward(definitions["rebuild"].handler) }),
} as RegisteredFunctions.RegisteredFunctionsForGroupSpec<typeof import("../../ledgerCells.spec")["default"]>;
