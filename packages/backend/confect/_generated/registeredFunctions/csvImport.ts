import { ConvexFunctionDefinitions, RegisteredConvexFunction, type RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import groupLayer from "../../csvImport.impl";

const forward = <Ctx, Args, Returns>(handler: (ctx: Ctx, args: Args) => Promise<Returns>) => (ctx: Ctx, args: Args) => handler(ctx, args);

const definitions = ConvexFunctionDefinitions.buildForGroup<typeof import("../../csvImport.spec")["default"]>(databaseSchema, groupLayer);

export default {
["csvImport"]: RegisteredConvexFunction.register({ ...definitions["csvImport"], handler: forward(definitions["csvImport"].handler) }),
} as RegisteredFunctions.RegisteredFunctionsForGroupSpec<typeof import("../../csvImport.spec")["default"]>;
