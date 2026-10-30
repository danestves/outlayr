import { FunctionSpec, GroupSpec } from "@confect/core";
import * as Schema from "effect/Schema";

import { ScanStatus } from "./receiptScan.spec";

export const installmentScanArgs = {
    accounts: Schema.Array(Schema.String),
    aiConsent: Schema.optional(Schema.Number),
    currency: Schema.String,
    image: Schema.instanceOf(ArrayBuffer),
    language: Schema.optional(Schema.String),
    regionCode: Schema.optional(Schema.String),
    shareAnalytics: Schema.optional(Schema.Boolean),
    today: Schema.String,
};

const PlanRow = Schema.Struct({
    amount: Schema.Number,
    dueDate: Schema.String,
    fee: Schema.Number,
    paid: Schema.Boolean,
    sequence: Schema.Number,
});

export const InstallmentPlanDraft = Schema.Struct({
    accountName: Schema.NullOr(Schema.String),
    currency: Schema.NullOr(Schema.String),
    provider: Schema.NullOr(Schema.String),
    rows: Schema.Array(PlanRow),
});

export const InstallmentScanResult = Schema.Struct({ plan: Schema.NullOr(InstallmentPlanDraft), status: ScanStatus });

export default GroupSpec.make().addFunction(
    FunctionSpec.publicAction({ args: () => installmentScanArgs, name: "scan", returns: () => InstallmentScanResult })
);
