import { ConvexFunctionDefinitions, RegisteredConvexFunction, type RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import groupLayer from "../../mail.impl";

const forward = <Ctx, Args, Returns>(handler: (ctx: Ctx, args: Args) => Promise<Returns>) => (ctx: Ctx, args: Args) => handler(ctx, args);

const definitions = ConvexFunctionDefinitions.buildForGroup<typeof import("../../mail.spec")["default"]>(databaseSchema, groupLayer);

export default {
["claimWelcome"]: RegisteredConvexFunction.register({ ...definitions["claimWelcome"], handler: forward(definitions["claimWelcome"].handler) }),
["rememberLanguage"]: RegisteredConvexFunction.register({ ...definitions["rememberLanguage"], handler: forward(definitions["rememberLanguage"].handler) }),
["welcomeRecipient"]: RegisteredConvexFunction.register({ ...definitions["welcomeRecipient"], handler: forward(definitions["welcomeRecipient"].handler) }),
["claimPro"]: RegisteredConvexFunction.register({ ...definitions["claimPro"], handler: forward(definitions["claimPro"].handler) }),
["recipient"]: RegisteredConvexFunction.register({ ...definitions["recipient"], handler: forward(definitions["recipient"].handler) }),
["noticeRecipients"]: RegisteredConvexFunction.register({ ...definitions["noticeRecipients"], handler: forward(definitions["noticeRecipients"].handler) }),
["recordNotice"]: RegisteredConvexFunction.register({ ...definitions["recordNotice"], handler: forward(definitions["recordNotice"].handler) }),
} as RegisteredFunctions.RegisteredFunctionsForGroupSpec<typeof import("../../mail.spec")["default"]>;
