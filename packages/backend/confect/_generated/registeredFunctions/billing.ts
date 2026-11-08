import { ConvexFunctionDefinitions, RegisteredConvexFunction, type RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import groupLayer from "../../billing.impl";

const forward = <Ctx, Args, Returns>(handler: (ctx: Ctx, args: Args) => Promise<Returns>) => (ctx: Ctx, args: Args) => handler(ctx, args);

const definitions = ConvexFunctionDefinitions.buildForGroup<typeof import("../../billing.spec")["default"]>(databaseSchema, groupLayer);

export default {
["createCheckout"]: RegisteredConvexFunction.register({ ...definitions["createCheckout"], handler: forward(definitions["createCheckout"].handler) }),
["confirmCheckout"]: RegisteredConvexFunction.register({ ...definitions["confirmCheckout"], handler: forward(definitions["confirmCheckout"].handler) }),
["restore"]: RegisteredConvexFunction.register({ ...definitions["restore"], handler: forward(definitions["restore"].handler) }),
["openPortal"]: RegisteredConvexFunction.register({ ...definitions["openPortal"], handler: forward(definitions["openPortal"].handler) }),
["plan"]: RegisteredConvexFunction.register({ ...definitions["plan"], handler: forward(definitions["plan"].handler) }),
} as RegisteredFunctions.RegisteredFunctionsForGroupSpec<typeof import("../../billing.spec")["default"]>;
