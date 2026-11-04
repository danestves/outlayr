import { ConvexFunctionDefinitions, RegisteredConvexFunction, type RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import groupLayer from "../../referrals.impl";

const forward = <Ctx, Args, Returns>(handler: (ctx: Ctx, args: Args) => Promise<Returns>) => (ctx: Ctx, args: Args) => handler(ctx, args);

const definitions = ConvexFunctionDefinitions.buildForGroup<typeof import("../../referrals.spec")["default"]>(databaseSchema, groupLayer);

export default {
["inviter"]: RegisteredConvexFunction.register({ ...definitions["inviter"], handler: forward(definitions["inviter"].handler) }),
["ensureCode"]: RegisteredConvexFunction.register({ ...definitions["ensureCode"], handler: forward(definitions["ensureCode"].handler) }),
["overview"]: RegisteredConvexFunction.register({ ...definitions["overview"], handler: forward(definitions["overview"].handler) }),
["redeem"]: RegisteredConvexFunction.register({ ...definitions["redeem"], handler: forward(definitions["redeem"].handler) }),
["claim"]: RegisteredConvexFunction.register({ ...definitions["claim"], handler: forward(definitions["claim"].handler) }),
["promoEnd"]: RegisteredConvexFunction.register({ ...definitions["promoEnd"], handler: forward(definitions["promoEnd"].handler) }),
["grant"]: RegisteredConvexFunction.register({ ...definitions["grant"], handler: forward(definitions["grant"].handler) }),
["releaseBanked"]: RegisteredConvexFunction.register({ ...definitions["releaseBanked"], handler: forward(definitions["releaseBanked"].handler) }),
["bankedMonths"]: RegisteredConvexFunction.register({ ...definitions["bankedMonths"], handler: forward(definitions["bankedMonths"].handler) }),
["sweepGrants"]: RegisteredConvexFunction.register({ ...definitions["sweepGrants"], handler: forward(definitions["sweepGrants"].handler) }),
["creditBanked"]: RegisteredConvexFunction.register({ ...definitions["creditBanked"], handler: forward(definitions["creditBanked"].handler) }),
} as RegisteredFunctions.RegisteredFunctionsForGroupSpec<typeof import("../../referrals.spec")["default"]>;
