import { ConvexFunctionDefinitions, RegisteredConvexFunction, type RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import groupLayer from "../../enrichmentQueue.impl";

const forward = <Ctx, Args, Returns>(handler: (ctx: Ctx, args: Args) => Promise<Returns>) => (ctx: Ctx, args: Args) => handler(ctx, args);

const definitions = ConvexFunctionDefinitions.buildForGroup<typeof import("../../enrichmentQueue.spec")["default"]>(databaseSchema, groupLayer);

export default {
["enqueue"]: RegisteredConvexFunction.register({ ...definitions["enqueue"], handler: forward(definitions["enqueue"].handler) }),
["job"]: RegisteredConvexFunction.register({ ...definitions["job"], handler: forward(definitions["job"].handler) }),
["work"]: definitions["work"].handler,
["finish"]: RegisteredConvexFunction.register({ ...definitions["finish"], handler: forward(definitions["finish"].handler) }),
["settled"]: definitions["settled"].handler,
["results"]: RegisteredConvexFunction.register({ ...definitions["results"], handler: forward(definitions["results"].handler) }),
["ack"]: RegisteredConvexFunction.register({ ...definitions["ack"], handler: forward(definitions["ack"].handler) }),
} as RegisteredFunctions.RegisteredFunctionsForGroupSpec<typeof import("../../enrichmentQueue.spec")["default"]>;
