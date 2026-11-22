import * as DateTime from "effect/DateTime";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import type { Docs } from "../_generated/docs";
import refs from "../_generated/refs";
import { DatabaseReader, DatabaseWriter, Scheduler } from "../_generated/services";

type Endpoint = Docs["webhookEndpoints"];

export type FiledEntry = Pick<
    Docs["transactions"],
    "accountId" | "amount" | "categoryId" | "currency" | "date" | "income" | "localId" | "note" | "updatedAt"
>;

const FiledEntryPayload = Schema.Struct({
    account: Schema.NullOr(Schema.String),
    amount: Schema.Number,
    category: Schema.NullOr(Schema.String),
    currency: Schema.NullOr(Schema.String),
    date: Schema.String,
    id: Schema.String,
    income: Schema.Boolean,
    note: Schema.String,
});

export const WebhookEvent = Schema.Union([
    Schema.Struct({
        createdAt: Schema.String,
        data: Schema.Struct({ entry: FiledEntryPayload }),
        id: Schema.String,
        type: Schema.Literal("entry.filed"),
    }),
    Schema.Struct({
        createdAt: Schema.String,
        data: Schema.Struct({}),
        id: Schema.String,
        type: Schema.Literal("ping"),
    }),
]);

const encodeEvent = Schema.encodeSync(Schema.fromJsonString(WebhookEvent));

export const isoAt = (ms: number) => DateTime.formatIso(DateTime.makeUnsafe(ms));

export const liveEndpoints = Effect.fn("WebhookEvents.liveEndpoints")(function* liveEndpoints(userId: string) {
    const endpoints = yield* (yield* DatabaseReader)
        .table("webhookEndpoints")
        .index("by_userId", (q) => q.eq("userId", userId))
        .collect();
    return endpoints.filter((endpoint) => endpoint.disabledAt === undefined);
});

export const queueEvent = Effect.fn("WebhookEvents.queueEvent")(function* queueEvent(
    endpoints: readonly Endpoint[],
    event: typeof WebhookEvent.Type
) {
    const writer = yield* DatabaseWriter;
    const scheduler = yield* Scheduler;
    const body = encodeEvent(event);
    for (const endpoint of endpoints) {
        const deliveryId = yield* writer.table("webhookDeliveries").insert({
            attempt: 0,
            body,
            endpointId: endpoint._id,
            eventId: event.id,
            type: event.type,
            userId: endpoint.userId,
        });
        yield* scheduler.runAfter(Duration.zero, refs.internal.webhooks.deliver, { deliveryId });
    }
});

const nameOf = Effect.fn("WebhookEvents.nameOf")(function* nameOf(
    table: "accounts" | "categories",
    userId: string,
    localId: string | null
) {
    if (localId === null) {
        return null;
    }
    const row = yield* (yield* DatabaseReader)
        .table(table)
        .get("by_user_and_localId", userId, localId)
        .pipe(Effect.catchTags({ GetByIndexFailure: () => Effect.succeed(null) }));
    return row?.name ?? null;
});

// Turning sync on uploads the whole history as new rows; only entries written after the endpoint was added count.
export const emitEntriesFiled = Effect.fn("WebhookEvents.emitEntriesFiled")(function* emitEntriesFiled(
    userId: string,
    entries: readonly FiledEntry[],
    now: number
) {
    if (entries.length === 0) {
        return;
    }
    const endpoints = yield* liveEndpoints(userId);
    for (const entry of endpoints.length === 0 ? [] : entries) {
        const listening = endpoints.filter((endpoint) => endpoint.createdAt <= entry.updatedAt);
        if (listening.length > 0) {
            const data = {
                entry: {
                    account: yield* nameOf("accounts", userId, entry.accountId ?? null),
                    amount: entry.amount,
                    category: yield* nameOf("categories", userId, entry.categoryId),
                    currency: entry.currency,
                    date: isoAt(entry.date),
                    id: entry.localId,
                    income: entry.income,
                    note: entry.note,
                },
            };
            yield* queueEvent(listening, {
                createdAt: isoAt(now),
                data,
                id: `evt_${entry.localId}`,
                type: "entry.filed",
            });
        }
    }
});
