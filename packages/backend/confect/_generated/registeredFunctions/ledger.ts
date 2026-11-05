import { ConvexFunctionDefinitions, RegisteredConvexFunction, type RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import groupLayer from "../../ledger.impl";

const forward = <Ctx, Args, Returns>(handler: (ctx: Ctx, args: Args) => Promise<Returns>) => (ctx: Ctx, args: Args) => handler(ctx, args);

const definitions = ConvexFunctionDefinitions.buildForGroup<typeof import("../../ledger.spec")["default"]>(databaseSchema, groupLayer);

export default {
["overview"]: RegisteredConvexFunction.register({ ...definitions["overview"], handler: forward(definitions["overview"].handler) }),
} as RegisteredFunctions.RegisteredFunctionsForGroupSpec<typeof import("../../ledger.spec")["default"]>;
