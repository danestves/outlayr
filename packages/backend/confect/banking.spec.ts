import { FunctionSpec, GroupSpec } from "@confect/core";
import {
    BankAccount,
    BankAccountKind,
    BankAccountStatus,
    BankingProviderName,
    BankTransaction,
    Institution,
} from "@outlayr/banking/provider";
import * as Schema from "effect/Schema";

import { Id } from "./_generated/id";

export const BankAccess = Schema.Literals(["allowed", "plan", "unavailable"]);

export const BankAccountView = Schema.Struct({
    filesInto: Schema.NullOr(Schema.String),
    id: Id("bankAccounts"),
    institution: Schema.String,
    kind: BankAccountKind,
    last4: Schema.NullOr(Schema.String),
    linkedAt: Schema.Number,
    name: Schema.String,
    provider: BankingProviderName,
    pulledAt: Schema.NullOr(Schema.Number),
    status: BankAccountStatus,
});

export const BankOverview = Schema.Struct({
    access: BankAccess,
    accounts: Schema.Array(BankAccountView),
});

export const InstitutionView = Schema.Struct({
    catchAll: Schema.Boolean,
    country: Schema.String,
    id: Id("bankInstitutions"),
    logo: Schema.NullOr(Schema.String),
    name: Schema.String,
    provider: BankingProviderName,
});

export const StartedLink = Schema.Union([
    Schema.Struct({
        clientSecret: Schema.String,
        id: Schema.String,
        kind: Schema.Literal("sdk"),
        provider: BankingProviderName,
    }),
    Schema.Struct({ kind: Schema.Literals(["plan", "unavailable", "retired", "failed"]) }),
]);

export const FinishedLink = Schema.Union([
    Schema.Struct({ kind: Schema.Literal("linked"), linked: Schema.Number }),
    Schema.Struct({ kind: Schema.Literals(["plan", "unavailable", "failed"]) }),
]);

export const PullTarget = Schema.Struct({
    accountId: Schema.String,
    cursor: Schema.NullOr(Schema.String),
    institution: Schema.String,
    last4: Schema.NullOr(Schema.String),
    provider: BankingProviderName,
    status: BankAccountStatus,
    userId: Schema.String,
});

export const HolderLookup = Schema.Union([
    Schema.Struct({ holder: Schema.String, kind: Schema.Literal("holder") }),
    Schema.Struct({ kind: Schema.Literal("none") }),
    Schema.Struct({ kind: Schema.Literal("deleting") }),
]);

export const SavedHolder = Schema.Union([
    Schema.Struct({ holder: Schema.String, kind: Schema.Literal("saved") }),
    Schema.Struct({ kind: Schema.Literal("deleting") }),
]);

export const BankHolderRow = Schema.Struct({ holder: Schema.String, provider: BankingProviderName });

const AccountRef = { id: Id("bankAccounts") };

const SweepPage = { cursor: Schema.NullOr(Schema.String) };

export default GroupSpec.make()
    .addFunction(FunctionSpec.publicQuery({ args: () => ({}), name: "overview", returns: () => BankOverview }))
    .addFunction(
        FunctionSpec.publicAction({
            args: () => ({ institution: Id("bankInstitutions") }),
            name: "startLink",
            returns: () => StartedLink,
        })
    )
    .addFunction(
        FunctionSpec.publicAction({
            args: () => ({ provider: BankingProviderName, sessionId: Schema.String }),
            name: "finishLink",
            returns: () => FinishedLink,
        })
    )
    .addFunction(
        FunctionSpec.publicQuery({
            // `region` only ranks the phone's country first; search never filters by country.
            args: () => ({ q: Schema.String, region: Schema.NullOr(Schema.String) }),
            name: "searchInstitutions",
            returns: () => Schema.Array(InstitutionView),
        })
    )
    .addFunction(FunctionSpec.publicAction({ args: () => AccountRef, name: "unlink", returns: () => Schema.Boolean }))
    .addFunction(
        FunctionSpec.publicMutation({
            args: () => ({ ...AccountRef, accountId: Schema.NullOr(Schema.String) }),
            name: "setFilesInto",
            returns: () => Schema.Boolean,
        })
    )
    .addFunction(
        FunctionSpec.internalQuery({
            args: () => ({ userId: Schema.String }),
            name: "accessFor",
            returns: () => BankAccess,
        })
    )
    .addFunction(
        FunctionSpec.internalQuery({
            args: () => ({ provider: BankingProviderName, userId: Schema.String }),
            name: "holderFor",
            returns: () => HolderLookup,
        })
    )
    .addFunction(
        FunctionSpec.internalQuery({
            args: () => ({ userId: Schema.String }),
            name: "holdersOf",
            returns: () => Schema.Array(BankHolderRow),
        })
    )
    .addFunction(
        FunctionSpec.internalMutation({
            args: () => ({ holder: Schema.String, provider: BankingProviderName, userId: Schema.String }),
            name: "saveHolder",
            returns: () => SavedHolder,
        })
    )
    .addFunction(
        FunctionSpec.internalMutation({
            args: () => ({ userId: Schema.String }),
            name: "dropHolders",
            returns: () => Schema.Null,
        })
    )
    .addFunction(
        FunctionSpec.internalMutation({
            args: () => ({ accounts: Schema.Array(BankAccount), provider: BankingProviderName, userId: Schema.String }),
            name: "saveAccounts",
            returns: () => Schema.Number,
        })
    )
    .addFunction(
        FunctionSpec.internalQuery({
            args: () => AccountRef,
            name: "pullTarget",
            returns: () => Schema.NullOr(PullTarget),
        })
    )
    .addFunction(
        FunctionSpec.internalMutation({
            args: () => AccountRef,
            name: "claimPull",
            returns: () => Schema.NullOr(Schema.String),
        })
    )
    .addFunction(
        FunctionSpec.internalMutation({
            args: () => ({ ...AccountRef, lease: Schema.String, txs: Schema.Array(BankTransaction) }),
            name: "fileTransactions",
            returns: () => Schema.Boolean,
        })
    )
    .addFunction(
        FunctionSpec.internalMutation({
            args: () => ({ ...AccountRef, lease: Schema.String }),
            name: "releasePull",
            returns: () => Schema.Null,
        })
    )
    .addFunction(
        FunctionSpec.internalMutation({
            args: () => ({
                ...AccountRef,
                from: Schema.NullOr(Schema.String),
                lease: Schema.String,
                to: Schema.NullOr(Schema.String),
            }),
            name: "advanceCursor",
            returns: () => Schema.Boolean,
        })
    )
    .addFunction(
        FunctionSpec.internalMutation({
            args: () => ({ ...AccountRef, status: BankAccountStatus }),
            name: "setStatus",
            returns: () => Schema.Null,
        })
    )
    .addFunction(
        FunctionSpec.internalMutation({
            args: () => ({
                accountId: Schema.String,
                kind: Schema.Literals(["account", "transactions"]),
                provider: BankingProviderName,
            }),
            name: "onEvent",
            returns: () => Schema.Null,
        })
    )
    .addFunction(
        FunctionSpec.internalMutation({ args: () => AccountRef, name: "removeAccount", returns: () => Schema.Null })
    )
    .addFunction(
        FunctionSpec.internalMutation({
            args: () => ({ bankAccountId: Id("bankAccounts") }),
            name: "dropBankEntries",
            returns: () => Schema.Null,
        })
    )
    .addFunction(FunctionSpec.internalAction({ args: () => AccountRef, name: "pull", returns: () => Schema.Null }))
    .addFunction(
        FunctionSpec.internalAction({ args: () => AccountRef, name: "refreshAccount", returns: () => Schema.Null })
    )
    .addFunction(
        FunctionSpec.internalQuery({
            args: () => SweepPage,
            name: "lapsed",
            returns: () =>
                Schema.Struct({ cursor: Schema.NullOr(Schema.String), ids: Schema.Array(Id("bankAccounts")) }),
        })
    )
    .addFunction(FunctionSpec.internalAction({ args: () => SweepPage, name: "sweep", returns: () => Schema.Null }))
    .addFunction(
        FunctionSpec.internalQuery({
            args: () => ({ id: Id("bankInstitutions") }),
            name: "institutionFor",
            returns: () =>
                Schema.NullOr(
                    Schema.Struct({ institution: Institution, provider: BankingProviderName, retired: Schema.Boolean })
                ),
        })
    )
    .addFunction(
        FunctionSpec.internalMutation({
            args: () => ({ id: Id("bankInstitutions") }),
            name: "countInstitutionUse",
            returns: () => Schema.Null,
        })
    )
    .addFunction(
        FunctionSpec.internalMutation({
            args: () => ({
                institutions: Schema.Array(Institution),
                provider: BankingProviderName,
                seenAt: Schema.Number,
            }),
            name: "saveInstitutions",
            returns: () => Schema.Null,
        })
    )
    .addFunction(
        FunctionSpec.internalMutation({
            args: () => ({
                cursor: Schema.NullOr(Schema.String),
                provider: BankingProviderName,
                seenAt: Schema.Number,
            }),
            name: "retireInstitutions",
            returns: () => Schema.NullOr(Schema.String),
        })
    )
    .addFunction(
        FunctionSpec.internalAction({ args: () => ({}), name: "syncInstitutions", returns: () => Schema.Null })
    );
