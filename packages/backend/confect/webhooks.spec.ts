import { FunctionSpec, GroupSpec } from "@confect/core";
import * as Schema from "effect/Schema";

import { Id } from "./_generated/id";
import { InboundWrite } from "./tables/inboundWrites";
import { LastDelivery } from "./tables/webhookEndpoints";

export const MIN_SECRET_LENGTH = 32;
export const MAX_SECRET_LENGTH = 128;
export const MAX_ENDPOINTS = 5;
export const MAX_INBOX = 200;
export const MAX_FAILURES = 20;

export const EndpointView = Schema.Struct({
    _id: Id("webhookEndpoints"),
    createdAt: Schema.Number,
    disabledAt: Schema.optional(Schema.Number),
    failures: Schema.Number,
    lastDelivery: Schema.optional(LastDelivery),
    url: Schema.String,
});

export const WebhookStatus = Schema.Struct({
    endpoints: Schema.Array(EndpointView),
    inbound: Schema.NullOr(
        Schema.Struct({ createdAt: Schema.Number, hint: Schema.String, lastUsedAt: Schema.optional(Schema.Number) })
    ),
});

export const AddedEndpoint = Schema.Union([
    Schema.Struct({ endpointId: Id("webhookEndpoints"), kind: Schema.Literal("added") }),
    Schema.Struct({ kind: Schema.Literals(["invalidUrl", "invalidSecret", "tooMany", "unavailable"]) }),
]);

export const Received = Schema.Union([
    Schema.Struct({ kind: Schema.Literals(["unknownToken", "refused", "full"]) }),
    Schema.Struct({ id: Id("inboundWrites"), kind: Schema.Literal("queued") }),
]);

export const InboxRow = Schema.Struct({ id: Id("inboundWrites"), receivedAt: Schema.Number, write: InboundWrite });

export const PendingDelivery = Schema.Struct({
    body: Schema.String,
    eventId: Schema.String,
    secret: Schema.String,
    type: Schema.String,
    url: Schema.String,
});

export default GroupSpec.make()
    .addFunction(
        FunctionSpec.publicQuery({
            args: () => ({}),
            name: "status",
            returns: () => WebhookStatus,
        })
    )
    .addFunction(
        FunctionSpec.publicMutation({
            args: () => ({ token: Schema.String }),
            name: "setInboundToken",
            returns: () => Schema.Boolean,
        })
    )
    .addFunction(
        FunctionSpec.publicMutation({
            args: () => ({}),
            name: "revokeInboundToken",
            returns: () => Schema.Null,
        })
    )
    .addFunction(
        FunctionSpec.publicMutation({
            args: () => ({ secret: Schema.String, url: Schema.String }),
            name: "addEndpoint",
            returns: () => AddedEndpoint,
        })
    )
    .addFunction(
        FunctionSpec.publicMutation({
            args: () => ({ endpointId: Id("webhookEndpoints") }),
            name: "removeEndpoint",
            returns: () => Schema.Null,
        })
    )
    .addFunction(
        FunctionSpec.publicMutation({
            args: () => ({ endpointId: Id("webhookEndpoints"), secret: Schema.String }),
            name: "setEndpointSecret",
            returns: () => Schema.Boolean,
        })
    )
    .addFunction(
        FunctionSpec.publicMutation({
            args: () => ({ endpointId: Id("webhookEndpoints") }),
            name: "testEndpoint",
            returns: () => Schema.Boolean,
        })
    )
    .addFunction(
        FunctionSpec.publicQuery({
            args: () => ({}),
            name: "inbox",
            returns: () => Schema.Array(InboxRow),
        })
    )
    .addFunction(
        FunctionSpec.publicMutation({
            args: () => ({ ids: Schema.Array(Id("inboundWrites")) }),
            name: "ackInbox",
            returns: () => Schema.Null,
        })
    )
    .addFunction(
        FunctionSpec.internalMutation({
            args: () => ({ tokenHash: Schema.String, write: InboundWrite }),
            name: "receive",
            returns: () => Received,
        })
    )
    .addFunction(
        FunctionSpec.internalMutation({
            args: () => ({}),
            name: "pump",
            returns: () => Schema.Null,
        })
    )
    .addFunction(
        FunctionSpec.internalQuery({
            args: () => ({ attempt: Schema.Number, deliveryId: Id("webhookDeliveries") }),
            name: "delivery",
            returns: () => Schema.NullOr(PendingDelivery),
        })
    )
    .addFunction(
        FunctionSpec.internalMutation({
            args: () => ({ attempt: Schema.Number, deliveryId: Id("webhookDeliveries"), status: Schema.Number }),
            name: "settleDelivery",
            returns: () => Schema.Null,
        })
    )
    .addFunction(
        FunctionSpec.internalAction({
            args: () => ({ attempt: Schema.Number, deliveryId: Id("webhookDeliveries") }),
            name: "deliver",
            returns: () => Schema.Null,
        })
    );
