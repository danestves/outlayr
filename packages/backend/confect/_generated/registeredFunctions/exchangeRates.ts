import { ConvexFunctionDefinitions, RegisteredConvexFunction, type RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import groupLayer from "../../exchangeRates.impl";

const forward = <Ctx, Args, Returns>(handler: (ctx: Ctx, args: Args) => Promise<Returns>) => (ctx: Ctx, args: Args) => handler(ctx, args);

const definitions = ConvexFunctionDefinitions.buildForGroup<typeof import("../../exchangeRates.spec")["default"]>(databaseSchema, groupLayer);

export default {
["upsertRates"]: RegisteredConvexFunction.register({ ...definitions["upsertRates"], handler: forward(definitions["upsertRates"].handler) }),
["pruneStaleBatch"]: RegisteredConvexFunction.register({ ...definitions["pruneStaleBatch"], handler: forward(definitions["pruneStaleBatch"].handler) }),
["pruneStale"]: RegisteredConvexFunction.register({ ...definitions["pruneStale"], handler: forward(definitions["pruneStale"].handler) }),
["pullRates"]: RegisteredConvexFunction.register({ ...definitions["pullRates"], handler: forward(definitions["pullRates"].handler) }),
["pullRecentRates"]: RegisteredConvexFunction.register({ ...definitions["pullRecentRates"], handler: forward(definitions["pullRecentRates"].handler) }),
} as RegisteredFunctions.RegisteredFunctionsForGroupSpec<typeof import("../../exchangeRates.spec")["default"]>;
