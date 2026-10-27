import { FunctionImpl, GroupImpl } from "@confect/server";
import * as Layer from "effect/Layer";

import databaseSchema from "./_generated/schema";
import {
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
import spec from "./accountDeletion.spec";

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "prepare", prepare)),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "submitGoogleLocalReceipt", submitGoogleLocalReceipt)),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "recordAppleRevocation", recordAppleRevocation)),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "recordCredentialOnly", recordCredentialOnly)),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "advance", advance)),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "billingTarget", billingTarget)),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "recordBillingErased", recordBillingErased)),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "eraseBilling", eraseBilling)),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "poll", poll)),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "resumeUserId", resumeUserId)),
    Layer.provide(FunctionImpl.make(databaseSchema, spec, "cleanupExpired", cleanupExpired)),
    GroupImpl.finalize
);
