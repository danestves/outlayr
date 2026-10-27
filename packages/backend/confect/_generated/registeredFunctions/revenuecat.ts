import { ConvexFunctionDefinitions, RegisteredConvexFunction, type RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import groupLayer from "../../revenuecat.impl";

const forward = <Ctx, Args, Returns>(handler: (ctx: Ctx, args: Args) => Promise<Returns>) => (ctx: Ctx, args: Args) => handler(ctx, args);

const definitions = ConvexFunctionDefinitions.buildForGroup<typeof import("../../revenuecat.spec")["default"]>(databaseSchema, groupLayer);

export default {
["mirrorSubscriber"]: RegisteredConvexFunction.register({ ...definitions["mirrorSubscriber"], handler: forward(definitions["mirrorSubscriber"].handler) }),
["mirroredEntitlement"]: RegisteredConvexFunction.register({ ...definitions["mirroredEntitlement"], handler: forward(definitions["mirroredEntitlement"].handler) }),
["sessionUserId"]: RegisteredConvexFunction.register({ ...definitions["sessionUserId"], handler: forward(definitions["sessionUserId"].handler) }),
["syncFromStore"]: RegisteredConvexFunction.register({ ...definitions["syncFromStore"], handler: forward(definitions["syncFromStore"].handler) }),
} as RegisteredFunctions.RegisteredFunctionsForGroupSpec<typeof import("../../revenuecat.spec")["default"]>;
