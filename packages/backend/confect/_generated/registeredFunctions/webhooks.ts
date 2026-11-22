import { ConvexFunctionDefinitions, RegisteredConvexFunction, type RegisteredFunctions } from "@confect/server";
import databaseSchema from "../schema";
import groupLayer from "../../webhooks.impl";

const forward = <Ctx, Args, Returns>(handler: (ctx: Ctx, args: Args) => Promise<Returns>) => (ctx: Ctx, args: Args) => handler(ctx, args);

const definitions = ConvexFunctionDefinitions.buildForGroup<typeof import("../../webhooks.spec")["default"]>(databaseSchema, groupLayer);

export default {
["status"]: RegisteredConvexFunction.register({ ...definitions["status"], handler: forward(definitions["status"].handler) }),
["setInboundToken"]: RegisteredConvexFunction.register({ ...definitions["setInboundToken"], handler: forward(definitions["setInboundToken"].handler) }),
["revokeInboundToken"]: RegisteredConvexFunction.register({ ...definitions["revokeInboundToken"], handler: forward(definitions["revokeInboundToken"].handler) }),
["addEndpoint"]: RegisteredConvexFunction.register({ ...definitions["addEndpoint"], handler: forward(definitions["addEndpoint"].handler) }),
["removeEndpoint"]: RegisteredConvexFunction.register({ ...definitions["removeEndpoint"], handler: forward(definitions["removeEndpoint"].handler) }),
["setEndpointSecret"]: RegisteredConvexFunction.register({ ...definitions["setEndpointSecret"], handler: forward(definitions["setEndpointSecret"].handler) }),
["testEndpoint"]: RegisteredConvexFunction.register({ ...definitions["testEndpoint"], handler: forward(definitions["testEndpoint"].handler) }),
["inbox"]: RegisteredConvexFunction.register({ ...definitions["inbox"], handler: forward(definitions["inbox"].handler) }),
["ackInbox"]: RegisteredConvexFunction.register({ ...definitions["ackInbox"], handler: forward(definitions["ackInbox"].handler) }),
["receive"]: RegisteredConvexFunction.register({ ...definitions["receive"], handler: forward(definitions["receive"].handler) }),
["pump"]: RegisteredConvexFunction.register({ ...definitions["pump"], handler: forward(definitions["pump"].handler) }),
["delivery"]: RegisteredConvexFunction.register({ ...definitions["delivery"], handler: forward(definitions["delivery"].handler) }),
["settleDelivery"]: RegisteredConvexFunction.register({ ...definitions["settleDelivery"], handler: forward(definitions["settleDelivery"].handler) }),
["deliver"]: RegisteredConvexFunction.register({ ...definitions["deliver"], handler: forward(definitions["deliver"].handler) }),
} as RegisteredFunctions.RegisteredFunctionsForGroupSpec<typeof import("../../webhooks.spec")["default"]>;
