import { ConvexFunctionDefinitions, RegisteredConvexFunction, type RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import groupLayer from "../../openexchangerates.impl";

const forward = <Ctx, Args, Returns>(handler: (ctx: Ctx, args: Args) => Promise<Returns>) => (ctx: Ctx, args: Args) => handler(ctx, args);

const definitions = ConvexFunctionDefinitions.buildForGroup<typeof import("../../openexchangerates.spec")["default"]>(databaseSchema, groupLayer);

export default {
["fetchRates"]: RegisteredConvexFunction.register({ ...definitions["fetchRates"], handler: forward(definitions["fetchRates"].handler) }),
} as RegisteredFunctions.RegisteredFunctionsForGroupSpec<typeof import("../../openexchangerates.spec")["default"]>;
