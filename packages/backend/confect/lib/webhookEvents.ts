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

export const wakePump = Effect.fn("WebhookEvents.wakePump")(function* wakePump(delay: Duration.Duration) {
    yield* (yield* Scheduler).runAfter(delay, refs.internal.webhooks.pump, {});
});

// Schedules nothing per delivery: a sync push can file 500 entries for 5 endpoints, past Convex's per-mutation
// cap on scheduled functions. The pump claims due rows in pages instead.
export const queueEvent = Effect.fn("WebhookEvents.queueEvent")(function* queueEvent(
    endpoints: readonly Endpoint[],
    event: typeof WebhookEvent.Type,
    now: number
) {
    const [first] = endpoints;
    if (first === undefined) {
        return 0;
    }
    const writer = yield* DatabaseWriter;
    const eventRef = yield* writer.table("webhookEvents").insert({
        body: encodeEvent(event),
        eventId: event.id,
        type: event.type,
        userId: first.userId,
    });
    for (const endpoint of endpoints) {
        yield* writer.table("webhookDeliveries").insert({
            attempt: 0,
            dueAt: now,
            endpointId: endpoint._id,
            eventRef,
            userId: endpoint.userId,
        });
    }
    return endpoints.length;
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

const RECENT_PURCHASE_MS = 7 * 86_400_000;
const FUTURE_PURCHASE_MS = 86_400_000;

// Turning sync on uploads the whole history as new rows, and an import files old purchases: only entries written
// after the endpoint was added, for a purchase in the last week, count as filed.
export const emitEntriesFiled = Effect.fn("WebhookEvents.emitEntriesFiled")(function* emitEntriesFiled(
    userId: string,
    entries: readonly FiledEntry[],
    now: number
) {
    const recent = entries.filter(
        (entry) => entry.date >= now - RECENT_PURCHASE_MS && entry.date <= now + FUTURE_PURCHASE_MS
    );
    const endpoints = recent.length === 0 ? [] : yield* liveEndpoints(userId);
    let queued = 0;
    for (const entry of endpoints.length === 0 ? [] : recent) {
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
            queued += yield* queueEvent(
                listening,
                { createdAt: isoAt(now), data, id: `evt_${entry.localId}`, type: "entry.filed" },
                now
            );
        }
    }
    if (queued > 0) {
        yield* wakePump(Duration.zero);
    }
});
