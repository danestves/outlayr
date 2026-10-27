import { ConvexFunctionDefinitions, RegisteredConvexFunction, type RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import groupLayer from "../../enrichment.impl";

const forward = <Ctx, Args, Returns>(handler: (ctx: Ctx, args: Args) => Promise<Returns>) => (ctx: Ctx, args: Args) => handler(ctx, args);

const definitions = ConvexFunctionDefinitions.buildForGroup<typeof import("../../enrichment.spec")["default"]>(databaseSchema, groupLayer);

export default {
["groundedConsent"]: RegisteredConvexFunction.register({ ...definitions["groundedConsent"], handler: forward(definitions["groundedConsent"].handler) }),
["suggest"]: RegisteredConvexFunction.register({ ...definitions["suggest"], handler: forward(definitions["suggest"].handler) }),
} as RegisteredFunctions.RegisteredFunctionsForGroupSpec<typeof import("../../enrichment.spec")["default"]>;
