import { ConvexFunctionDefinitions, RegisteredConvexFunction, type RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import groupLayer from "../../merchantKnowledge.impl";

const forward = <Ctx, Args, Returns>(handler: (ctx: Ctx, args: Args) => Promise<Returns>) => (ctx: Ctx, args: Args) => handler(ctx, args);

const definitions = ConvexFunctionDefinitions.buildForGroup<typeof import("../../merchantKnowledge.spec")["default"]>(databaseSchema, groupLayer);

export default {
["lookup"]: RegisteredConvexFunction.register({ ...definitions["lookup"], handler: forward(definitions["lookup"].handler) }),
["lookupMany"]: RegisteredConvexFunction.register({ ...definitions["lookupMany"], handler: forward(definitions["lookupMany"].handler) }),
["record"]: RegisteredConvexFunction.register({ ...definitions["record"], handler: forward(definitions["record"].handler) }),
["purge"]: RegisteredConvexFunction.register({ ...definitions["purge"], handler: forward(definitions["purge"].handler) }),
} as RegisteredFunctions.RegisteredFunctionsForGroupSpec<typeof import("../../merchantKnowledge.spec")["default"]>;
