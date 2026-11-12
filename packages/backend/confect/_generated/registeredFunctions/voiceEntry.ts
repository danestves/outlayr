import { ConvexFunctionDefinitions, RegisteredConvexFunction, type RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import groupLayer from "../../voiceEntry.impl";

const forward = <Ctx, Args, Returns>(handler: (ctx: Ctx, args: Args) => Promise<Returns>) => (ctx: Ctx, args: Args) => handler(ctx, args);

const definitions = ConvexFunctionDefinitions.buildForGroup<typeof import("../../voiceEntry.spec")["default"]>(databaseSchema, groupLayer);

export default {
["startThread"]: RegisteredConvexFunction.register({ ...definitions["startThread"], handler: forward(definitions["startThread"].handler) }),
["expireThread"]: RegisteredConvexFunction.register({ ...definitions["expireThread"], handler: forward(definitions["expireThread"].handler) }),
["listTurns"]: definitions["listTurns"].handler,
["endThread"]: RegisteredConvexFunction.register({ ...definitions["endThread"], handler: forward(definitions["endThread"].handler) }),
["admit"]: RegisteredConvexFunction.register({ ...definitions["admit"], handler: forward(definitions["admit"].handler) }),
["speak"]: RegisteredConvexFunction.register({ ...definitions["speak"], handler: forward(definitions["speak"].handler) }),
["openStream"]: RegisteredConvexFunction.register({ ...definitions["openStream"], handler: forward(definitions["openStream"].handler) }),
["speakText"]: RegisteredConvexFunction.register({ ...definitions["speakText"], handler: forward(definitions["speakText"].handler) }),
["grantStream"]: RegisteredConvexFunction.register({ ...definitions["grantStream"], handler: forward(definitions["grantStream"].handler) }),
["spendStream"]: RegisteredConvexFunction.register({ ...definitions["spendStream"], handler: forward(definitions["spendStream"].handler) }),
} as RegisteredFunctions.RegisteredFunctionsForGroupSpec<typeof import("../../voiceEntry.spec")["default"]>;
