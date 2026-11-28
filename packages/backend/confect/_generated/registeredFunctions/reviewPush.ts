import { ConvexFunctionDefinitions, RegisteredConvexFunction, type RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import groupLayer from "../../reviewPush.impl";

const forward = <Ctx, Args, Returns>(handler: (ctx: Ctx, args: Args) => Promise<Returns>) => (ctx: Ctx, args: Args) => handler(ctx, args);

const definitions = ConvexFunctionDefinitions.buildForGroup<typeof import("../../reviewPush.spec")["default"]>(databaseSchema, groupLayer);

export default {
["setTarget"]: RegisteredConvexFunction.register({ ...definitions["setTarget"], handler: forward(definitions["setTarget"].handler) }),
["clearTarget"]: RegisteredConvexFunction.register({ ...definitions["clearTarget"], handler: forward(definitions["clearTarget"].handler) }),
["targets"]: RegisteredConvexFunction.register({ ...definitions["targets"], handler: forward(definitions["targets"].handler) }),
["dropTarget"]: RegisteredConvexFunction.register({ ...definitions["dropTarget"], handler: forward(definitions["dropTarget"].handler) }),
["deliver"]: RegisteredConvexFunction.register({ ...definitions["deliver"], handler: forward(definitions["deliver"].handler) }),
} as RegisteredFunctions.RegisteredFunctionsForGroupSpec<typeof import("../../reviewPush.spec")["default"]>;
