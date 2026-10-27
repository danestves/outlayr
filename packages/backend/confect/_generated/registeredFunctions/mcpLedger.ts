import { ConvexFunctionDefinitions, RegisteredConvexFunction, type RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import groupLayer from "../../mcpLedger.impl";

const forward = <Ctx, Args, Returns>(handler: (ctx: Ctx, args: Args) => Promise<Returns>) => (ctx: Ctx, args: Args) => handler(ctx, args);

const definitions = ConvexFunctionDefinitions.buildForGroup<typeof import("../../mcpLedger.spec")["default"]>(databaseSchema, groupLayer);

export default {
["recentTransactions"]: RegisteredConvexFunction.register({ ...definitions["recentTransactions"], handler: forward(definitions["recentTransactions"].handler) }),
["spendingSummary"]: RegisteredConvexFunction.register({ ...definitions["spendingSummary"], handler: forward(definitions["spendingSummary"].handler) }),
["accountBalances"]: RegisteredConvexFunction.register({ ...definitions["accountBalances"], handler: forward(definitions["accountBalances"].handler) }),
["budgetStatus"]: RegisteredConvexFunction.register({ ...definitions["budgetStatus"], handler: forward(definitions["budgetStatus"].handler) }),
["upcomingCharges"]: RegisteredConvexFunction.register({ ...definitions["upcomingCharges"], handler: forward(definitions["upcomingCharges"].handler) }),
} as RegisteredFunctions.RegisteredFunctionsForGroupSpec<typeof import("../../mcpLedger.spec")["default"]>;
