import { ConvexFunctionDefinitions, RegisteredConvexFunction, type RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import groupLayer from "../../accountDeletion.impl";

const forward = <Ctx, Args, Returns>(handler: (ctx: Ctx, args: Args) => Promise<Returns>) => (ctx: Ctx, args: Args) => handler(ctx, args);

const definitions = ConvexFunctionDefinitions.buildForGroup<typeof import("../../accountDeletion.spec")["default"]>(databaseSchema, groupLayer);

export default {
["prepare"]: RegisteredConvexFunction.register({ ...definitions["prepare"], handler: forward(definitions["prepare"].handler) }),
["submitGoogleLocalReceipt"]: RegisteredConvexFunction.register({ ...definitions["submitGoogleLocalReceipt"], handler: forward(definitions["submitGoogleLocalReceipt"].handler) }),
["recordAppleRevocation"]: RegisteredConvexFunction.register({ ...definitions["recordAppleRevocation"], handler: forward(definitions["recordAppleRevocation"].handler) }),
["recordCredentialOnly"]: RegisteredConvexFunction.register({ ...definitions["recordCredentialOnly"], handler: forward(definitions["recordCredentialOnly"].handler) }),
["advance"]: RegisteredConvexFunction.register({ ...definitions["advance"], handler: forward(definitions["advance"].handler) }),
["billingTarget"]: RegisteredConvexFunction.register({ ...definitions["billingTarget"], handler: forward(definitions["billingTarget"].handler) }),
["recordBillingErased"]: RegisteredConvexFunction.register({ ...definitions["recordBillingErased"], handler: forward(definitions["recordBillingErased"].handler) }),
["eraseBilling"]: RegisteredConvexFunction.register({ ...definitions["eraseBilling"], handler: forward(definitions["eraseBilling"].handler) }),
["poll"]: RegisteredConvexFunction.register({ ...definitions["poll"], handler: forward(definitions["poll"].handler) }),
["resumeUserId"]: RegisteredConvexFunction.register({ ...definitions["resumeUserId"], handler: forward(definitions["resumeUserId"].handler) }),
["cleanupExpired"]: RegisteredConvexFunction.register({ ...definitions["cleanupExpired"], handler: forward(definitions["cleanupExpired"].handler) }),
} as RegisteredFunctions.RegisteredFunctionsForGroupSpec<typeof import("../../accountDeletion.spec")["default"]>;
