import { ConvexFunctionDefinitions, RegisteredConvexFunction, type RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import groupLayer from "../../profileSharing.impl";

const forward = <Ctx, Args, Returns>(handler: (ctx: Ctx, args: Args) => Promise<Returns>) => (ctx: Ctx, args: Args) => handler(ctx, args);

const definitions = ConvexFunctionDefinitions.buildForGroup<typeof import("../../profileSharing.spec")["default"]>(databaseSchema, groupLayer);

export default {
["enabled"]: RegisteredConvexFunction.register({ ...definitions["enabled"], handler: forward(definitions["enabled"].handler) }),
["createInvite"]: RegisteredConvexFunction.register({ ...definitions["createInvite"], handler: forward(definitions["createInvite"].handler) }),
["invite"]: RegisteredConvexFunction.register({ ...definitions["invite"], handler: forward(definitions["invite"].handler) }),
["claim"]: RegisteredConvexFunction.register({ ...definitions["claim"], handler: forward(definitions["claim"].handler) }),
["joined"]: RegisteredConvexFunction.register({ ...definitions["joined"], handler: forward(definitions["joined"].handler) }),
["members"]: RegisteredConvexFunction.register({ ...definitions["members"], handler: forward(definitions["members"].handler) }),
["removeMember"]: RegisteredConvexFunction.register({ ...definitions["removeMember"], handler: forward(definitions["removeMember"].handler) }),
["leave"]: RegisteredConvexFunction.register({ ...definitions["leave"], handler: forward(definitions["leave"].handler) }),
} as RegisteredFunctions.RegisteredFunctionsForGroupSpec<typeof import("../../profileSharing.spec")["default"]>;
