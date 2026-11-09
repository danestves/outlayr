import { ConvexFunctionDefinitions, RegisteredConvexFunction, type RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import groupLayer from "../../webPush.impl";

const forward = <Ctx, Args, Returns>(handler: (ctx: Ctx, args: Args) => Promise<Returns>) => (ctx: Ctx, args: Args) => handler(ctx, args);

const definitions = ConvexFunctionDefinitions.buildForGroup<typeof import("../../webPush.spec")["default"]>(databaseSchema, groupLayer);

export default {
["config"]: RegisteredConvexFunction.register({ ...definitions["config"], handler: forward(definitions["config"].handler) }),
["mine"]: RegisteredConvexFunction.register({ ...definitions["mine"], handler: forward(definitions["mine"].handler) }),
["save"]: RegisteredConvexFunction.register({ ...definitions["save"], handler: forward(definitions["save"].handler) }),
["remove"]: RegisteredConvexFunction.register({ ...definitions["remove"], handler: forward(definitions["remove"].handler) }),
["due"]: RegisteredConvexFunction.register({ ...definitions["due"], handler: forward(definitions["due"].handler) }),
["markSent"]: RegisteredConvexFunction.register({ ...definitions["markSent"], handler: forward(definitions["markSent"].handler) }),
["drop"]: RegisteredConvexFunction.register({ ...definitions["drop"], handler: forward(definitions["drop"].handler) }),
["sendDue"]: RegisteredConvexFunction.register({ ...definitions["sendDue"], handler: forward(definitions["sendDue"].handler) }),
} as RegisteredFunctions.RegisteredFunctionsForGroupSpec<typeof import("../../webPush.spec")["default"]>;
