import { FunctionSpec, GroupSpec } from "@confect/core";
import * as Schema from "effect/Schema";

import accountDeletionJobs from "./_generated/tables/accountDeletionJobs";

const DeletionStatus = Schema.Struct({
    errorCode: accountDeletionJobs.Fields.fields.errorCode,
    phase: accountDeletionJobs.Fields.fields.phase,
});

const ResumeArgs = () => ({ resumeSecret: Schema.String });

export default GroupSpec.make()
    .addFunction(
        FunctionSpec.publicMutation({
            name: "prepare",
            args: () => ({}),
            returns: () => Schema.Struct({ receiptChallenge: Schema.String, resumeSecret: Schema.String }),
        })
    )
    .addFunction(
        FunctionSpec.publicMutation({
            name: "submitGoogleLocalReceipt",
            args: () => ({ receiptChallenge: Schema.String, resumeSecret: Schema.String }),
            returns: () => DeletionStatus,
        })
    )
    .addFunction(
        FunctionSpec.publicMutation({ name: "recordAppleRevocation", args: ResumeArgs, returns: () => DeletionStatus })
    )
    .addFunction(
        FunctionSpec.publicMutation({ name: "recordCredentialOnly", args: ResumeArgs, returns: () => DeletionStatus })
    )
    .addFunction(FunctionSpec.publicMutation({ name: "advance", args: ResumeArgs, returns: () => DeletionStatus }))
    .addFunction(
        FunctionSpec.internalQuery({
            name: "billingTarget",
            args: ResumeArgs,
            returns: () => Schema.NullOr(Schema.String),
        })
    )
    .addFunction(
        FunctionSpec.internalMutation({ name: "recordBillingErased", args: ResumeArgs, returns: () => DeletionStatus })
    )
    .addFunction(FunctionSpec.publicAction({ name: "eraseBilling", args: ResumeArgs, returns: () => DeletionStatus }))
    .addFunction(
        FunctionSpec.publicQuery({
            name: "poll",
            args: () => ({ at: Schema.optional(Schema.Number), resumeSecret: Schema.String }),
            returns: () => Schema.NullOr(DeletionStatus),
        })
    )
    .addFunction(FunctionSpec.internalQuery({ name: "resumeUserId", args: ResumeArgs, returns: () => Schema.String }))
    .addFunction(
        FunctionSpec.internalMutation({ name: "cleanupExpired", args: () => ({}), returns: () => Schema.Null })
    );
