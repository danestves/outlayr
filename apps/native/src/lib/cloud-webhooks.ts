import { api } from "@outlayr/backend/convex/_generated/api";

import type { InboxTransport } from "@/data/inbound-writes";

import { cloudMutation, cloudQuery } from "./convex";

export function inboundWritesTransport(): InboxTransport {
    return {
        ack: (ids) => cloudMutation(api.webhooks.ackInbox, { ids }),
        inbox: () => cloudQuery(api.webhooks.inbox, {}),
    };
}
