import { FunctionSpec, GroupSpec } from "@confect/core";
import * as Schema from "effect/Schema";

import accounts from "./_generated/tables/accounts";
import appMeta from "./_generated/tables/appMeta";
import budgets from "./_generated/tables/budgets";
import categories from "./_generated/tables/categories";
import exchangeRates from "./_generated/tables/exchangeRates";
import installmentPlans from "./_generated/tables/installmentPlans";
import mainBudget from "./_generated/tables/mainBudget";
import outsideMoves from "./_generated/tables/outsideMoves";
import outsidePayments from "./_generated/tables/outsidePayments";
import transactions from "./_generated/tables/transactions";
import transfers from "./_generated/tables/transfers";

export default GroupSpec.make()
    .addFunction(FunctionSpec.publicPaginatedQuery({ item: () => transactions.Doc, name: "transactions" }))
    .addFunction(FunctionSpec.publicPaginatedQuery({ item: () => transfers.Doc, name: "transfers" }))
    .addFunction(
        FunctionSpec.publicQuery({ args: () => ({}), name: "accounts", returns: () => Schema.Array(accounts.Doc) })
    )
    .addFunction(
        FunctionSpec.publicQuery({ args: () => ({}), name: "appMeta", returns: () => Schema.Array(appMeta.Doc) })
    )
    .addFunction(
        FunctionSpec.publicQuery({ args: () => ({}), name: "budgets", returns: () => Schema.Array(budgets.Doc) })
    )
    .addFunction(
        FunctionSpec.publicQuery({ args: () => ({}), name: "categories", returns: () => Schema.Array(categories.Doc) })
    )
    .addFunction(
        FunctionSpec.publicQuery({
            args: () => ({}),
            name: "exchangeRates",
            returns: () => Schema.Array(exchangeRates.Doc),
        })
    )
    .addFunction(
        FunctionSpec.publicQuery({
            args: () => ({}),
            name: "installmentPlans",
            returns: () => Schema.Array(installmentPlans.Doc),
        })
    )
    .addFunction(
        FunctionSpec.publicQuery({ args: () => ({}), name: "mainBudget", returns: () => Schema.Array(mainBudget.Doc) })
    )
    .addFunction(
        FunctionSpec.publicQuery({
            args: () => ({}),
            name: "outsideMoves",
            returns: () => Schema.Array(outsideMoves.Doc),
        })
    )
    .addFunction(
        FunctionSpec.publicQuery({
            args: () => ({}),
            name: "outsidePayments",
            returns: () => Schema.Array(outsidePayments.Doc),
        })
    );
