import { ConvexFunctionDefinitions, RegisteredConvexFunction, type RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import groupLayer from "../../sharedReports.impl";

const forward = <Ctx, Args, Returns>(handler: (ctx: Ctx, args: Args) => Promise<Returns>) => (ctx: Ctx, args: Args) => handler(ctx, args);

const definitions = ConvexFunctionDefinitions.buildForGroup<typeof import("../../sharedReports.spec")["default"]>(databaseSchema, groupLayer);

export default {
["mine"]: RegisteredConvexFunction.register({ ...definitions["mine"], handler: forward(definitions["mine"].handler) }),
["publish"]: RegisteredConvexFunction.register({ ...definitions["publish"], handler: forward(definitions["publish"].handler) }),
["remove"]: RegisteredConvexFunction.register({ ...definitions["remove"], handler: forward(definitions["remove"].handler) }),
["view"]: RegisteredConvexFunction.register({ ...definitions["view"], handler: forward(definitions["view"].handler) }),
["dropExpired"]: RegisteredConvexFunction.register({ ...definitions["dropExpired"], handler: forward(definitions["dropExpired"].handler) }),
} as RegisteredFunctions.RegisteredFunctionsForGroupSpec<typeof import("../../sharedReports.spec")["default"]>;
