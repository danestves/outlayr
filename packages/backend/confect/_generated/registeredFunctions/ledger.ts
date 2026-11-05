import { ConvexFunctionDefinitions, RegisteredConvexFunction, type RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import groupLayer from "../../ledger.impl";

const forward = <Ctx, Args, Returns>(handler: (ctx: Ctx, args: Args) => Promise<Returns>) => (ctx: Ctx, args: Args) => handler(ctx, args);

const definitions = ConvexFunctionDefinitions.buildForGroup<typeof import("../../ledger.spec")["default"]>(databaseSchema, groupLayer);

export default {
["transactions"]: RegisteredConvexFunction.register({ ...definitions["transactions"], handler: forward(definitions["transactions"].handler) }),
["transfers"]: RegisteredConvexFunction.register({ ...definitions["transfers"], handler: forward(definitions["transfers"].handler) }),
["accounts"]: RegisteredConvexFunction.register({ ...definitions["accounts"], handler: forward(definitions["accounts"].handler) }),
["appMeta"]: RegisteredConvexFunction.register({ ...definitions["appMeta"], handler: forward(definitions["appMeta"].handler) }),
["budgets"]: RegisteredConvexFunction.register({ ...definitions["budgets"], handler: forward(definitions["budgets"].handler) }),
["categories"]: RegisteredConvexFunction.register({ ...definitions["categories"], handler: forward(definitions["categories"].handler) }),
["exchangeRates"]: RegisteredConvexFunction.register({ ...definitions["exchangeRates"], handler: forward(definitions["exchangeRates"].handler) }),
["installmentPlans"]: RegisteredConvexFunction.register({ ...definitions["installmentPlans"], handler: forward(definitions["installmentPlans"].handler) }),
["mainBudget"]: RegisteredConvexFunction.register({ ...definitions["mainBudget"], handler: forward(definitions["mainBudget"].handler) }),
["outsideMoves"]: RegisteredConvexFunction.register({ ...definitions["outsideMoves"], handler: forward(definitions["outsideMoves"].handler) }),
["outsidePayments"]: RegisteredConvexFunction.register({ ...definitions["outsidePayments"], handler: forward(definitions["outsidePayments"].handler) }),
} as RegisteredFunctions.RegisteredFunctionsForGroupSpec<typeof import("../../ledger.spec")["default"]>;
