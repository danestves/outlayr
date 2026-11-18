import { ConvexFunctionDefinitions, RegisteredConvexFunction, type RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import groupLayer from "../../captureLookup.impl";

const forward = <Ctx, Args, Returns>(handler: (ctx: Ctx, args: Args) => Promise<Returns>) => (ctx: Ctx, args: Args) => handler(ctx, args);

const definitions = ConvexFunctionDefinitions.buildForGroup<typeof import("../../captureLookup.spec")["default"]>(databaseSchema, groupLayer);

export default {
["register"]: RegisteredConvexFunction.register({ ...definitions["register"], handler: forward(definitions["register"].handler) }),
["revoke"]: RegisteredConvexFunction.register({ ...definitions["revoke"], handler: forward(definitions["revoke"].handler) }),
["open"]: RegisteredConvexFunction.register({ ...definitions["open"], handler: forward(definitions["open"].handler) }),
["settle"]: RegisteredConvexFunction.register({ ...definitions["settle"], handler: forward(definitions["settle"].handler) }),
["setPush"]: RegisteredConvexFunction.register({ ...definitions["setPush"], handler: forward(definitions["setPush"].handler) }),
["pushTarget"]: RegisteredConvexFunction.register({ ...definitions["pushTarget"], handler: forward(definitions["pushTarget"].handler) }),
["dropPush"]: RegisteredConvexFunction.register({ ...definitions["dropPush"], handler: forward(definitions["dropPush"].handler) }),
["push"]: RegisteredConvexFunction.register({ ...definitions["push"], handler: forward(definitions["push"].handler) }),
} as RegisteredFunctions.RegisteredFunctionsForGroupSpec<typeof import("../../captureLookup.spec")["default"]>;
