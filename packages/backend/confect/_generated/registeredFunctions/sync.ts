import { ConvexFunctionDefinitions, RegisteredConvexFunction, type RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import groupLayer from "../../sync.impl";

const forward = <Ctx, Args, Returns>(handler: (ctx: Ctx, args: Args) => Promise<Returns>) => (ctx: Ctx, args: Args) => handler(ctx, args);

const definitions = ConvexFunctionDefinitions.buildForGroup<typeof import("../../sync.spec")["default"]>(databaseSchema, groupLayer);

export default {
["push"]: RegisteredConvexFunction.register({ ...definitions["push"], handler: forward(definitions["push"].handler) }),
["pullSince"]: RegisteredConvexFunction.register({ ...definitions["pullSince"], handler: forward(definitions["pullSince"].handler) }),
["currentSeq"]: RegisteredConvexFunction.register({ ...definitions["currentSeq"], handler: forward(definitions["currentSeq"].handler) }),
} as RegisteredFunctions.RegisteredFunctionsForGroupSpec<typeof import("../../sync.spec")["default"]>;
