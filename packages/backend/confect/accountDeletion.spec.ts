import { FunctionSpec, GroupSpec } from "@confect/core";

import type {
    advance,
    billingTarget,
    cleanupExpired,
    eraseBilling,
    poll,
    prepare,
    recordAppleRevocation,
    recordBillingErased,
    recordCredentialOnly,
    resumeUserId,
    submitGoogleLocalReceipt,
} from "./accountDeletion";

export default GroupSpec.make()
    .addFunction(FunctionSpec.convexPublicMutation<typeof prepare>()("prepare"))
    .addFunction(FunctionSpec.convexPublicMutation<typeof submitGoogleLocalReceipt>()("submitGoogleLocalReceipt"))
    .addFunction(FunctionSpec.convexPublicMutation<typeof recordAppleRevocation>()("recordAppleRevocation"))
    .addFunction(FunctionSpec.convexPublicMutation<typeof recordCredentialOnly>()("recordCredentialOnly"))
    .addFunction(FunctionSpec.convexPublicMutation<typeof advance>()("advance"))
    .addFunction(FunctionSpec.convexInternalQuery<typeof billingTarget>()("billingTarget"))
    .addFunction(FunctionSpec.convexInternalMutation<typeof recordBillingErased>()("recordBillingErased"))
    .addFunction(FunctionSpec.convexPublicAction<typeof eraseBilling>()("eraseBilling"))
    .addFunction(FunctionSpec.convexPublicQuery<typeof poll>()("poll"))
    .addFunction(FunctionSpec.convexInternalQuery<typeof resumeUserId>()("resumeUserId"))
    .addFunction(FunctionSpec.convexInternalMutation<typeof cleanupExpired>()("cleanupExpired"));
