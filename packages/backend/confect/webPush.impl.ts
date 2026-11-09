import { FunctionImpl, GroupImpl } from "@confect/server";
import * as Clock from "effect/Clock";
import * as Console from "effect/Console";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";

import refs from "./_generated/refs";
import databaseSchema from "./_generated/schema";
import {
    DatabaseReader,
    DatabaseWriter,
    MutationCtx,
    MutationRunner,
    QueryCtx,
    QueryRunner,
} from "./_generated/services";
import { requireUserId } from "./lib/auth";
import { vapidConfig } from "./lib/config";
import { dieAsConvexError } from "./lib/convexError";
import {
    encryptPush,
    isValidTimeZone,
    localClock,
    newServerKeys,
    nudgeText,
    reminderDue,
    vapidAuthorization,
} from "./lib/webPush";
import spec from "./webPush.spec";

const MINUTES_A_DAY = 1440;
const PUSH_TTL_SECONDS = 3600;
const GONE = new Set([404, 410]);

const nullOnMissing = { GetByIndexFailure: () => Effect.succeed(null) } as const;

const subscriptionAt = Effect.fn("WebPush.subscriptionAt")(function* subscriptionAt(endpoint: string) {
    return yield* (yield* DatabaseReader)
        .table("webPushSubscriptions")
        .get("by_endpoint", endpoint)
        .pipe(Effect.catchTags(nullOnMissing));
});

const config = FunctionImpl.make(
    databaseSchema,
    spec,
    "config",
    Effect.fn("WebPush.config")(function* config() {
        const vapid = yield* vapidConfig;
        return { publicKey: Option.isSome(vapid) ? vapid.value.publicKey : null };
    }, Effect.orDie)
);

const mine = FunctionImpl.make(
    databaseSchema,
    spec,
    "mine",
    Effect.fn("WebPush.mine")(
        function* mine({ endpoint }) {
            const userId = yield* requireUserId(yield* QueryCtx);
            const row = yield* subscriptionAt(endpoint);
            return row?.userId === userId ? { dailyMinute: row.dailyMinute } : null;
        },
        Effect.catchTags({ Unauthenticated: dieAsConvexError }),
        Effect.orDie
    )
);

const save = FunctionImpl.make(
    databaseSchema,
    spec,
    "save",
    Effect.fn("WebPush.save")(
        function* save({ auth, dailyMinute, endpoint, locale, p256dh, timeZone }) {
            const userId = yield* requireUserId(yield* MutationCtx);
            const validEndpoint = new URL(endpoint).protocol === "https:";
            const validMinute = Number.isInteger(dailyMinute) && dailyMinute >= 0 && dailyMinute < MINUTES_A_DAY;
            if (!(validEndpoint && validMinute && isValidTimeZone(timeZone))) {
                return yield* Effect.die(new Error("Invalid reminder"));
            }
            if (Option.isNone(yield* vapidConfig)) {
                return yield* Effect.die(new Error("Web push is off"));
            }
            const writer = yield* DatabaseWriter;
            const fields = { auth, dailyMinute, endpoint, locale, p256dh, timeZone, userId };
            const existing = yield* subscriptionAt(endpoint);
            if (existing !== null && existing.userId !== userId) {
                return yield* Effect.die(new Error("Invalid reminder"));
            }
            const table = writer.table("webPushSubscriptions");
            yield* existing === null
                ? table.insert({ ...fields, lastSentDay: null })
                : table.patch(existing._id, fields);
            return null;
        },
        Effect.catchTags({ Unauthenticated: dieAsConvexError }),
        Effect.orDie
    )
);

const remove = FunctionImpl.make(
    databaseSchema,
    spec,
    "remove",
    Effect.fn("WebPush.remove")(
        function* remove({ endpoint }) {
            const userId = yield* requireUserId(yield* MutationCtx);
            const existing = yield* subscriptionAt(endpoint);
            if (existing?.userId === userId) {
                yield* (yield* DatabaseWriter).table("webPushSubscriptions").delete(existing._id);
            }
            return null;
        },
        Effect.catchTags({ Unauthenticated: dieAsConvexError }),
        Effect.orDie
    )
);

const due = FunctionImpl.make(
    databaseSchema,
    spec,
    "due",
    Effect.fn("WebPush.due")(function* due() {
        const reader = yield* DatabaseReader;
        const now = yield* Clock.currentTimeMillis;
        const rows = yield* reader.table("webPushSubscriptions").index("by_endpoint").collect();
        const dueRows = [];
        for (const row of rows) {
            const clock = localClock(now, row.timeZone);
            if (reminderDue(row, clock)) {
                const logged = yield* reader
                    .table("transactions")
                    .index("by_user_and_deletedAt_and_date", (q) =>
                        q.eq("userId", row.userId).eq("deletedAt", null).gte("date", clock.dayStartMs).lte("date", now)
                    )
                    .first();
                if (Option.isNone(logged)) {
                    dueRows.push({
                        auth: row.auth,
                        day: clock.day,
                        endpoint: row.endpoint,
                        id: row._id,
                        locale: row.locale,
                        p256dh: row.p256dh,
                    });
                }
            }
        }
        return dueRows;
    }, Effect.orDie)
);

const markSent = FunctionImpl.make(
    databaseSchema,
    spec,
    "markSent",
    Effect.fn("WebPush.markSent")(function* markSent({ day, id }) {
        yield* (yield* DatabaseWriter).table("webPushSubscriptions").patch(id, { lastSentDay: day });
        return null;
    }, Effect.orDie)
);

const drop = FunctionImpl.make(
    databaseSchema,
    spec,
    "drop",
    Effect.fn("WebPush.drop")(function* drop({ id }) {
        yield* (yield* DatabaseWriter).table("webPushSubscriptions").delete(id);
        return null;
    }, Effect.orDie)
);

const sendDue = FunctionImpl.make(
    databaseSchema,
    spec,
    "sendDue",
    Effect.fn("WebPush.sendDue")(function* sendDue() {
        const vapid = yield* vapidConfig;
        if (Option.isNone(vapid)) {
            return null;
        }
        const { runQuery } = yield* QueryRunner;
        const { runMutation } = yield* MutationRunner;
        const reminders = yield* runQuery(refs.internal.webPush.due, {});
        const nowSeconds = Math.floor((yield* Clock.currentTimeMillis) / 1000);
        for (const reminder of reminders) {
            const { status } = yield* Effect.tryPromise(async () => {
                const body = await encryptPush(
                    JSON.stringify({ body: nudgeText(reminder.locale), title: "Outlayr" }),
                    reminder,
                    await newServerKeys()
                );
                return fetch(reminder.endpoint, {
                    body,
                    headers: {
                        Authorization: await vapidAuthorization(
                            reminder.endpoint,
                            {
                                privateKey: Redacted.value(vapid.value.privateKey),
                                publicKey: vapid.value.publicKey,
                                subject: vapid.value.subject,
                            },
                            nowSeconds
                        ),
                        "Content-Encoding": "aes128gcm",
                        "Content-Type": "application/octet-stream",
                        TTL: String(PUSH_TTL_SECONDS),
                    },
                    method: "POST",
                });
            }).pipe(Effect.catch(() => Effect.succeed({ status: 0 })));
            if (GONE.has(status)) {
                yield* runMutation(refs.internal.webPush.drop, { id: reminder.id });
            } else if (status >= 200 && status < 300) {
                yield* runMutation(refs.internal.webPush.markSent, { day: reminder.day, id: reminder.id });
            } else {
                yield* Console.error(`[web push] not sent: ${status}`);
            }
        }
        return null;
    }, Effect.orDie)
);

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(config),
    Layer.provide(mine),
    Layer.provide(save),
    Layer.provide(remove),
    Layer.provide(due),
    Layer.provide(markSent),
    Layer.provide(drop),
    Layer.provide(sendDue),
    GroupImpl.finalize
);
