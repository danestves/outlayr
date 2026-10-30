import { FunctionSpec, GroupSpec } from "@confect/core";
import * as Schema from "effect/Schema";

export const submitArgs = {
    appVersion: Schema.String,
    linkAccount: Schema.Boolean,
    locale: Schema.String,
    notify: Schema.Boolean,
    osName: Schema.String,
    osVersion: Schema.String,
    reason: Schema.String,
    submissionId: Schema.String,
    wish: Schema.String,
};

export const SubmitStatus = Schema.Literals(["ok", "invalid", "rateLimited", "notConfigured", "providerError"]);

export type SubmitStatus = typeof SubmitStatus.Type;

export default GroupSpec.make().addFunction(
    FunctionSpec.publicAction({ args: () => submitArgs, name: "submit", returns: () => SubmitStatus })
);
