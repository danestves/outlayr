import { ConvexFunctionDefinitions, RegisteredConvexFunction, type RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import groupLayer from "../../banking.impl";

const forward = <Ctx, Args, Returns>(handler: (ctx: Ctx, args: Args) => Promise<Returns>) => (ctx: Ctx, args: Args) => handler(ctx, args);

const definitions = ConvexFunctionDefinitions.buildForGroup<typeof import("../../banking.spec")["default"]>(databaseSchema, groupLayer);

export default {
["overview"]: RegisteredConvexFunction.register({ ...definitions["overview"], handler: forward(definitions["overview"].handler) }),
["startLink"]: RegisteredConvexFunction.register({ ...definitions["startLink"], handler: forward(definitions["startLink"].handler) }),
["finishLink"]: RegisteredConvexFunction.register({ ...definitions["finishLink"], handler: forward(definitions["finishLink"].handler) }),
["unlink"]: RegisteredConvexFunction.register({ ...definitions["unlink"], handler: forward(definitions["unlink"].handler) }),
["accessFor"]: RegisteredConvexFunction.register({ ...definitions["accessFor"], handler: forward(definitions["accessFor"].handler) }),
["holderFor"]: RegisteredConvexFunction.register({ ...definitions["holderFor"], handler: forward(definitions["holderFor"].handler) }),
["holdersOf"]: RegisteredConvexFunction.register({ ...definitions["holdersOf"], handler: forward(definitions["holdersOf"].handler) }),
["saveHolder"]: RegisteredConvexFunction.register({ ...definitions["saveHolder"], handler: forward(definitions["saveHolder"].handler) }),
["dropHolders"]: RegisteredConvexFunction.register({ ...definitions["dropHolders"], handler: forward(definitions["dropHolders"].handler) }),
["saveAccounts"]: RegisteredConvexFunction.register({ ...definitions["saveAccounts"], handler: forward(definitions["saveAccounts"].handler) }),
["pullTarget"]: RegisteredConvexFunction.register({ ...definitions["pullTarget"], handler: forward(definitions["pullTarget"].handler) }),
["inboxFull"]: RegisteredConvexFunction.register({ ...definitions["inboxFull"], handler: forward(definitions["inboxFull"].handler) }),
["claimPull"]: RegisteredConvexFunction.register({ ...definitions["claimPull"], handler: forward(definitions["claimPull"].handler) }),
["queueWrites"]: RegisteredConvexFunction.register({ ...definitions["queueWrites"], handler: forward(definitions["queueWrites"].handler) }),
["releasePull"]: RegisteredConvexFunction.register({ ...definitions["releasePull"], handler: forward(definitions["releasePull"].handler) }),
["advanceCursor"]: RegisteredConvexFunction.register({ ...definitions["advanceCursor"], handler: forward(definitions["advanceCursor"].handler) }),
["setStatus"]: RegisteredConvexFunction.register({ ...definitions["setStatus"], handler: forward(definitions["setStatus"].handler) }),
["onEvent"]: RegisteredConvexFunction.register({ ...definitions["onEvent"], handler: forward(definitions["onEvent"].handler) }),
["removeAccount"]: RegisteredConvexFunction.register({ ...definitions["removeAccount"], handler: forward(definitions["removeAccount"].handler) }),
["pull"]: RegisteredConvexFunction.register({ ...definitions["pull"], handler: forward(definitions["pull"].handler) }),
["refreshAccount"]: RegisteredConvexFunction.register({ ...definitions["refreshAccount"], handler: forward(definitions["refreshAccount"].handler) }),
["lapsed"]: RegisteredConvexFunction.register({ ...definitions["lapsed"], handler: forward(definitions["lapsed"].handler) }),
["sweep"]: RegisteredConvexFunction.register({ ...definitions["sweep"], handler: forward(definitions["sweep"].handler) }),
} as RegisteredFunctions.RegisteredFunctionsForGroupSpec<typeof import("../../banking.spec")["default"]>;
