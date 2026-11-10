import { FunctionImpl, GroupImpl } from "@confect/server";
import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import databaseSchema from "./_generated/schema";
import { DatabaseReader, DatabaseWriter, MutationCtx, QueryCtx } from "./_generated/services";
import { requireUserId } from "./lib/auth";
import { dieAsConvexError } from "./lib/convexError";
import { fits, LIFETIMES, MAX_LINKS, newSlug, SLUG } from "./sharedReports";
import spec from "./sharedReports.spec";

const EXPIRED_BATCH = 200;

const live = (row: { expiresAt: number | null }, now: number) => row.expiresAt === null || row.expiresAt > now;

const linksOf = Effect.fn("SharedReports.linksOf")(function* linksOf(userId: string) {
    return yield* (yield* DatabaseReader)
        .table("sharedReports")
        .index("by_userId_and_reportId", (q) => q.eq("userId", userId))
        .take(MAX_LINKS * 2);
});

const mine = FunctionImpl.make(
    databaseSchema,
    spec,
    "mine",
    Effect.fn("SharedReports.mine")(
        function* mine() {
            const userId = yield* requireUserId(yield* QueryCtx);
            const now = yield* Clock.currentTimeMillis;
            const rows = yield* linksOf(userId);
            return rows
                .filter((row) => live(row, now))
                .map(({ expiresAt, report, reportId, slug }) => ({ expiresAt, reportId, slug, unit: report.unit }));
        },
        Effect.catchTags({ Unauthenticated: dieAsConvexError }),
        Effect.orDie
    )
);

const publish = FunctionImpl.make(
    databaseSchema,
    spec,
    "publish",
    Effect.fn("SharedReports.publish")(
        function* publish({ expires, report, reportId }) {
            const userId = yield* requireUserId(yield* MutationCtx);
            if (!fits(reportId, report)) {
                return yield* Effect.die(new Error("Invalid report"));
            }
            const now = yield* Clock.currentTimeMillis;
            const table = (yield* DatabaseWriter).table("sharedReports");
            const held = yield* linksOf(userId);
            const existing = held.find((row) => row.reportId === reportId);
            if (existing && live(existing, now)) {
                const expiresAt = expires === "keep" ? existing.expiresAt : expiryOf(expires, now);
                yield* table.patch(existing._id, { expiresAt, report, updatedAt: now });
                return { expiresAt, slug: existing.slug };
            }
            // An expired link is never revived: whoever kept its address must not see the report again.
            if (existing) {
                yield* table.delete(existing._id);
            }
            if (held.filter((row) => row !== existing && live(row, now)).length >= MAX_LINKS) {
                return yield* Effect.die(new Error("Too many shared reports"));
            }
            const expiresAt = expiryOf(expires === "keep" ? "month" : expires, now);
            const slug = newSlug();
            yield* table.insert({ expiresAt, report, reportId, slug, updatedAt: now, userId });
            return { expiresAt, slug };
        },
        Effect.catchTags({ Unauthenticated: dieAsConvexError }),
        Effect.orDie
    )
);

const expiryOf = (expires: "month" | "never" | "week", now: number) =>
    expires === "never" ? null : now + LIFETIMES[expires];

const remove = FunctionImpl.make(
    databaseSchema,
    spec,
    "remove",
    Effect.fn("SharedReports.remove")(
        function* remove({ reportId }) {
            const userId = yield* requireUserId(yield* MutationCtx);
            const table = (yield* DatabaseWriter).table("sharedReports");
            const held = yield* linksOf(userId);
            for (const row of held.filter((each) => each.reportId === reportId)) {
                yield* table.delete(row._id);
            }
            return null;
        },
        Effect.catchTags({ Unauthenticated: dieAsConvexError }),
        Effect.orDie
    )
);

const view = FunctionImpl.make(
    databaseSchema,
    spec,
    "view",
    Effect.fn("SharedReports.view")(function* view({ slug }) {
        if (!SLUG.test(slug)) {
            return null;
        }
        const now = yield* Clock.currentTimeMillis;
        const row = yield* (yield* DatabaseReader)
            .table("sharedReports")
            .index("by_slug", (q) => q.eq("slug", slug))
            .first();
        return Option.isSome(row) && live(row.value, now)
            ? { report: row.value.report, updatedAt: row.value.updatedAt }
            : null;
    }, Effect.orDie)
);

const dropExpired = FunctionImpl.make(
    databaseSchema,
    spec,
    "dropExpired",
    Effect.fn("SharedReports.dropExpired")(function* dropExpired() {
        const now = yield* Clock.currentTimeMillis;
        const table = (yield* DatabaseWriter).table("sharedReports");
        const rows = yield* (yield* DatabaseReader)
            .table("sharedReports")
            .index("by_expiresAt", (q) => q.gte("expiresAt", 0).lte("expiresAt", now))
            .take(EXPIRED_BATCH);
        for (const row of rows) {
            yield* table.delete(row._id);
        }
        return null;
    }, Effect.orDie)
);

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(mine),
    Layer.provide(publish),
    Layer.provide(remove),
    Layer.provide(view),
    Layer.provide(dropExpired),
    GroupImpl.finalize
);
