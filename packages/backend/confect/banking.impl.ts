import { FunctionImpl, GroupImpl } from "@confect/server";
import { bankingProviders } from "@outlayr/banking/registry";
import * as Clock from "effect/Clock";
import * as Console from "effect/Console";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import refs from "./_generated/refs";
import databaseSchema from "./_generated/schema";
import {
    ActionCtx,
    DatabaseReader,
    DatabaseWriter,
    MutationCtx,
    MutationRunner,
    QueryCtx,
    QueryRunner,
    Scheduler,
} from "./_generated/services";
import { configuredClients, toInboundWrite } from "./banking";
import spec from "./banking.spec";
import { BANKING_EFFECTIVE_AT_MS } from "./legal";
import { requireUserId } from "./lib/auth";
import { authComponent } from "./lib/betterAuth";
import { dieAsConvexError } from "./lib/convexError";
import { outboundHttp } from "./lib/http";
import { refuseWhileDeleting } from "./lib/syncGuards";
import { isPro } from "./revenuecat";
import { MAX_INBOX } from "./webhooks.spec";

type Entitled = Parameters<typeof isPro>[0];

const WRITE_CHUNK = 100;
const LAPSED_SCAN = 25;
// Matches the action time limit, so a crashed pull blocks its account for one run at most.
const PULL_LEASE_MS = 10 * 60 * 1000;

type Configured = Effect.Success<ReturnType<typeof configuredClients>>[number];

const countriesOf = (configured: readonly Configured[]) => [
    ...new Set(configured.flatMap(({ name }) => bankingProviders[name].countries)),
];

const accessForUser = Effect.fn("Banking.accessForUser")(function* accessForUser(
    ctx: Entitled,
    userId: string,
    configured: readonly Configured[]
) {
    if (configured.length === 0 || (yield* Clock.currentTimeMillis) < BANKING_EFFECTIVE_AT_MS) {
        return "unavailable" as const;
    }
    return (yield* isPro(ctx, userId)) ? ("allowed" as const) : ("plan" as const);
});

const bankingUser = Effect.fn("Banking.user")(function* bankingUser() {
    const ctx = yield* ActionCtx;
    const user = yield* Effect.promise(() => authComponent.safeGetAuthUser(ctx));
    return user && user.isAnonymous !== true ? { email: user.email, id: String(user._id) } : null;
});

const isAlreadyDisconnected = (error: { readonly reason: string; readonly status?: number }) =>
    error.reason === "disconnected" || (error.reason === "rejected" && error.status === 404);

const deletingAccount = (userId: string) =>
    refuseWhileDeleting(userId).pipe(
        Effect.as(false),
        Effect.catchTags({ AccountDeleting: () => Effect.succeed(true) })
    );

const overview = FunctionImpl.make(
    databaseSchema,
    spec,
    "overview",
    Effect.fn("Banking.overview")(
        function* overview() {
            const ctx = yield* QueryCtx;
            const userId = yield* requireUserId(ctx);
            const configured = yield* configuredClients();
            const rows = yield* (yield* DatabaseReader)
                .table("bankAccounts")
                .index("by_userId", (q) => q.eq("userId", userId))
                .collect();
            return {
                access: yield* accessForUser(ctx, userId, configured),
                accounts: rows.map((row) => ({
                    id: row._id,
                    institution: row.institution,
                    kind: row.kind,
                    last4: row.last4,
                    linkedAt: row.linkedAt,
                    name: row.name,
                    provider: row.provider,
                    pulledAt: row.pulledAt ?? null,
                    status: row.status,
                })),
                countries: countriesOf(configured),
            };
        },
        Effect.catchTags({ Unauthenticated: dieAsConvexError }),
        Effect.orDie
    )
);

const startLink = FunctionImpl.make(
    databaseSchema,
    spec,
    "startLink",
    Effect.fn("Banking.startLink")(
        function* startLink({ country }) {
            const { runMutation } = yield* MutationRunner;
            const { runQuery } = yield* QueryRunner;
            const user = yield* bankingUser();
            if (user === null) {
                return { kind: "unavailable" as const };
            }
            const configured = yield* configuredClients();
            const access = yield* accessForUser(yield* ActionCtx, user.id, configured);
            if (access !== "allowed") {
                return { kind: access };
            }
            const match = configured.find(({ name }) => bankingProviders[name].countries.includes(country));
            if (match === undefined) {
                return { kind: "country" as const };
            }
            const existing = yield* runQuery(refs.internal.banking.holderFor, {
                provider: match.name,
                userId: user.id,
            });
            if (existing.kind === "deleting") {
                return { kind: "failed" as const };
            }
            let holder: string;
            if (existing.kind === "holder") {
                ({ holder } = existing);
            } else {
                const created = yield* match.client.createHolder({ email: user.email, id: user.id });
                const saved = yield* runMutation(refs.internal.banking.saveHolder, {
                    holder: created,
                    provider: match.name,
                    userId: user.id,
                });
                if (saved.kind === "deleting") {
                    yield* match.client
                        .forgetUser(user.id, [created])
                        .pipe(
                            Effect.catchCause((cause) =>
                                Console.warn("[banking] could not forget a holder created during deletion", cause)
                            )
                        );
                    return { kind: "failed" as const };
                }
                ({ holder } = saved);
            }
            const session = yield* match.client.startLink({ country, holder });
            return {
                clientSecret: session.clientSecret,
                id: session.id,
                kind: "sdk" as const,
                provider: match.name,
            };
        },
        Effect.provide(outboundHttp),
        Effect.catchTags({
            BankingError: (error) =>
                Console.warn("[banking] link start failed", error).pipe(Effect.as({ kind: "failed" as const })),
        }),
        Effect.orDie
    )
);

const finishLink = FunctionImpl.make(
    databaseSchema,
    spec,
    "finishLink",
    Effect.fn("Banking.finishLink")(
        function* finishLink({ provider, sessionId }) {
            const { runMutation } = yield* MutationRunner;
            const { runQuery } = yield* QueryRunner;
            const user = yield* bankingUser();
            if (user === null) {
                return { kind: "unavailable" as const };
            }
            const configured = yield* configuredClients();
            const access = yield* accessForUser(yield* ActionCtx, user.id, configured);
            if (access !== "allowed") {
                return { kind: access };
            }
            const match = configured.find(({ name }) => name === provider);
            if (match === undefined) {
                return { kind: "unavailable" as const };
            }
            const existing = yield* runQuery(refs.internal.banking.holderFor, { provider, userId: user.id });
            if (existing.kind !== "holder") {
                return { kind: "failed" as const };
            }
            const accounts = yield* match.client.finishLink(existing.holder, sessionId);
            const linked = yield* runMutation(refs.internal.banking.saveAccounts, {
                accounts,
                provider,
                userId: user.id,
            });
            return { kind: "linked" as const, linked };
        },
        Effect.provide(outboundHttp),
        Effect.catchTags({
            BankingError: (error) =>
                Console.warn("[banking] link finish failed", error).pipe(Effect.as({ kind: "failed" as const })),
        }),
        Effect.orDie
    )
);

const unlink = FunctionImpl.make(
    databaseSchema,
    spec,
    "unlink",
    Effect.fn("Banking.unlink")(
        function* unlink({ id }) {
            const { runMutation } = yield* MutationRunner;
            const { runQuery } = yield* QueryRunner;
            const user = yield* bankingUser();
            if (user === null) {
                return false;
            }
            const target = yield* runQuery(refs.internal.banking.pullTarget, { id });
            if (target === null || target.userId !== user.id) {
                return false;
            }
            const configured = yield* configuredClients();
            const match = configured.find(({ name }) => name === target.provider);
            if (match === undefined) {
                return false;
            }
            const disconnected = yield* match.client.disconnect(target.accountId).pipe(
                Effect.as(true),
                Effect.catchTags({
                    BankingError: (error) =>
                        isAlreadyDisconnected(error)
                            ? Effect.succeed(true)
                            : Console.warn("[banking] disconnect failed", error).pipe(Effect.as(false)),
                })
            );
            if (!disconnected) {
                return false;
            }
            yield* runMutation(refs.internal.banking.removeAccount, { id });
            return true;
        },
        Effect.provide(outboundHttp),
        Effect.orDie
    )
);

const accessFor = FunctionImpl.make(
    databaseSchema,
    spec,
    "accessFor",
    Effect.fn("Banking.accessFor")(function* accessFor({ userId }) {
        const configured = yield* configuredClients();
        return yield* accessForUser(yield* QueryCtx, userId, configured);
    }, Effect.orDie)
);

const holderFor = FunctionImpl.make(
    databaseSchema,
    spec,
    "holderFor",
    Effect.fn("Banking.holderFor")(function* holderFor({ provider, userId }) {
        if (yield* deletingAccount(userId)) {
            return { kind: "deleting" as const };
        }
        const row = yield* (yield* DatabaseReader)
            .table("bankHolders")
            .get("by_userId_and_provider", userId, provider)
            .pipe(Effect.catchTags({ GetByIndexFailure: () => Effect.succeed(null) }));
        return row === null ? { kind: "none" as const } : { holder: row.holder, kind: "holder" as const };
    }, Effect.orDie)
);

const holdersOf = FunctionImpl.make(
    databaseSchema,
    spec,
    "holdersOf",
    Effect.fn("Banking.holdersOf")(function* holdersOf({ userId }) {
        const rows = yield* (yield* DatabaseReader)
            .table("bankHolders")
            .index("by_userId_and_provider", (q) => q.eq("userId", userId))
            .collect();
        return rows.map(({ holder, provider }) => ({ holder, provider }));
    }, Effect.orDie)
);

const saveHolder = FunctionImpl.make(
    databaseSchema,
    spec,
    "saveHolder",
    Effect.fn("Banking.saveHolder")(function* saveHolder({ holder, provider, userId }) {
        if (yield* deletingAccount(userId)) {
            return { kind: "deleting" as const };
        }
        // A completed deletion clears the job's userId, so only the missing auth record still marks the user gone.
        const ctx = yield* MutationCtx;
        const authUser = yield* Effect.promise(() => authComponent.getAnyUserById(ctx, userId));
        if (authUser === null) {
            return { kind: "deleting" as const };
        }
        const reader = yield* DatabaseReader;
        const existing = yield* reader
            .table("bankHolders")
            .get("by_userId_and_provider", userId, provider)
            .pipe(Effect.catchTags({ GetByIndexFailure: () => Effect.succeed(null) }));
        if (existing !== null) {
            return { holder: existing.holder, kind: "saved" as const };
        }
        yield* (yield* DatabaseWriter).table("bankHolders").insert({ holder, provider, userId });
        return { holder, kind: "saved" as const };
    }, Effect.orDie)
);

const dropHolders = FunctionImpl.make(
    databaseSchema,
    spec,
    "dropHolders",
    Effect.fn("Banking.dropHolders")(function* dropHolders({ userId }) {
        const reader = yield* DatabaseReader;
        const writer = yield* DatabaseWriter;
        const rows = yield* reader
            .table("bankHolders")
            .index("by_userId_and_provider", (q) => q.eq("userId", userId))
            .collect();
        for (const row of rows) {
            yield* writer.table("bankHolders").delete(row._id);
        }
        return null;
    }, Effect.orDie)
);

const saveAccounts = FunctionImpl.make(
    databaseSchema,
    spec,
    "saveAccounts",
    Effect.fn("Banking.saveAccounts")(function* saveAccounts({ accounts, provider, userId }) {
        if (yield* deletingAccount(userId)) {
            return 0;
        }
        const reader = yield* DatabaseReader;
        const writer = yield* DatabaseWriter;
        const scheduler = yield* Scheduler;
        const now = yield* Clock.currentTimeMillis;
        let saved = 0;
        for (const account of accounts) {
            const existing = yield* reader
                .table("bankAccounts")
                .get("by_provider_and_accountId", provider, account.id)
                .pipe(Effect.catchTags({ GetByIndexFailure: () => Effect.succeed(null) }));
            if (existing !== null && existing.userId !== userId) {
                continue;
            }
            let id = existing?._id;
            if (existing === null) {
                id = yield* writer.table("bankAccounts").insert({
                    accountId: account.id,
                    institution: account.institution,
                    kind: account.kind,
                    last4: account.last4,
                    linkedAt: now,
                    name: account.name,
                    provider,
                    status: account.status,
                    userId,
                });
            } else {
                yield* writer.table("bankAccounts").patch(existing._id, {
                    institution: account.institution,
                    kind: account.kind,
                    last4: account.last4,
                    name: account.name,
                    status: account.status,
                });
            }
            if (id !== undefined && account.status === "active") {
                yield* scheduler.runAfter(Duration.zero, refs.internal.banking.pull, { id });
            }
            saved += 1;
        }
        return saved;
    }, Effect.orDie)
);

const pullTarget = FunctionImpl.make(
    databaseSchema,
    spec,
    "pullTarget",
    Effect.fn("Banking.pullTarget")(function* pullTarget({ id }) {
        const row = yield* (yield* DatabaseReader)
            .table("bankAccounts")
            .get(id)
            .pipe(Effect.catchTags({ GetByIdFailure: () => Effect.succeed(null) }));
        if (row === null) {
            return null;
        }
        return {
            accountId: row.accountId,
            cursor: row.cursor ?? null,
            institution: row.institution,
            last4: row.last4,
            provider: row.provider,
            status: row.status,
            userId: row.userId,
        };
    }, Effect.orDie)
);

const inboxFull = FunctionImpl.make(
    databaseSchema,
    spec,
    "inboxFull",
    Effect.fn("Banking.inboxFull")(function* inboxFull({ userId }) {
        const queued = yield* (yield* DatabaseReader)
            .table("inboundWrites")
            .index("by_userId", (q) => q.eq("userId", userId))
            .take(MAX_INBOX);
        return queued.length >= MAX_INBOX;
    }, Effect.orDie)
);

const claimPull = FunctionImpl.make(
    databaseSchema,
    spec,
    "claimPull",
    Effect.fn("Banking.claimPull")(function* claimPull({ id }) {
        const reader = yield* DatabaseReader;
        const row = yield* reader
            .table("bankAccounts")
            .get(id)
            .pipe(Effect.catchTags({ GetByIdFailure: () => Effect.succeed(null) }));
        if (row === null || (yield* deletingAccount(row.userId))) {
            return null;
        }
        const writer = yield* DatabaseWriter;
        const now = yield* Clock.currentTimeMillis;
        if (row.pullLease !== undefined && row.pullLease.until > now) {
            yield* writer.table("bankAccounts").patch(id, { pullAgain: true });
            return null;
        }
        const token = crypto.randomUUID();
        yield* writer.table("bankAccounts").patch(id, {
            pullAgain: false,
            pullLease: { token, until: now + PULL_LEASE_MS },
        });
        return token;
    }, Effect.orDie)
);

const queueWrites = FunctionImpl.make(
    databaseSchema,
    spec,
    "queueWrites",
    Effect.fn("Banking.queueWrites")(function* queueWrites({ id, lease, writes }) {
        const reader = yield* DatabaseReader;
        const row = yield* reader
            .table("bankAccounts")
            .get(id)
            .pipe(Effect.catchTags({ GetByIdFailure: () => Effect.succeed(null) }));
        if (row === null || row.pullLease?.token !== lease || (yield* deletingAccount(row.userId))) {
            return false;
        }
        const writer = yield* DatabaseWriter;
        const now = yield* Clock.currentTimeMillis;
        for (const write of writes) {
            yield* writer.table("inboundWrites").insert({ receivedAt: now, userId: row.userId, write });
        }
        return true;
    }, Effect.orDie)
);

const releasePull = FunctionImpl.make(
    databaseSchema,
    spec,
    "releasePull",
    Effect.fn("Banking.releasePull")(function* releasePull({ id, lease }) {
        const reader = yield* DatabaseReader;
        const row = yield* reader
            .table("bankAccounts")
            .get(id)
            .pipe(Effect.catchTags({ GetByIdFailure: () => Effect.succeed(null) }));
        if (row === null || row.pullLease?.token !== lease) {
            return null;
        }
        const again = row.pullAgain === true;
        yield* (yield* DatabaseWriter).table("bankAccounts").patch(id, {
            pullAgain: undefined,
            pullLease: undefined,
        });
        if (again) {
            yield* (yield* Scheduler).runAfter(Duration.zero, refs.internal.banking.pull, { id });
        }
        return null;
    }, Effect.orDie)
);

const advanceCursor = FunctionImpl.make(
    databaseSchema,
    spec,
    "advanceCursor",
    Effect.fn("Banking.advanceCursor")(function* advanceCursor({ from, id, lease, to }) {
        const reader = yield* DatabaseReader;
        const row = yield* reader
            .table("bankAccounts")
            .get(id)
            .pipe(Effect.catchTags({ GetByIdFailure: () => Effect.succeed(null) }));
        if (row === null || row.pullLease?.token !== lease || (row.cursor ?? null) !== from) {
            return false;
        }
        const again = row.pullAgain === true;
        yield* (yield* DatabaseWriter).table("bankAccounts").patch(id, {
            cursor: to ?? undefined,
            pullAgain: undefined,
            pullLease: undefined,
            pulledAt: yield* Clock.currentTimeMillis,
        });
        if (again) {
            yield* (yield* Scheduler).runAfter(Duration.zero, refs.internal.banking.pull, { id });
        }
        return true;
    }, Effect.orDie)
);

const setStatus = FunctionImpl.make(
    databaseSchema,
    spec,
    "setStatus",
    Effect.fn("Banking.setStatus")(function* setStatus({ id, status }) {
        const reader = yield* DatabaseReader;
        const row = yield* reader
            .table("bankAccounts")
            .get(id)
            .pipe(Effect.catchTags({ GetByIdFailure: () => Effect.succeed(null) }));
        if (row !== null) {
            yield* (yield* DatabaseWriter).table("bankAccounts").patch(id, { status });
        }
        return null;
    }, Effect.orDie)
);

const removeAccount = FunctionImpl.make(
    databaseSchema,
    spec,
    "removeAccount",
    Effect.fn("Banking.removeAccount")(function* removeAccount({ id }) {
        const reader = yield* DatabaseReader;
        const row = yield* reader
            .table("bankAccounts")
            .get(id)
            .pipe(Effect.catchTags({ GetByIdFailure: () => Effect.succeed(null) }));
        if (row !== null) {
            yield* (yield* DatabaseWriter).table("bankAccounts").delete(id);
        }
        return null;
    }, Effect.orDie)
);

const onEvent = FunctionImpl.make(
    databaseSchema,
    spec,
    "onEvent",
    Effect.fn("Banking.onEvent")(function* onEvent({ accountId, kind, provider }) {
        const row = yield* (yield* DatabaseReader)
            .table("bankAccounts")
            .get("by_provider_and_accountId", provider, accountId)
            .pipe(Effect.catchTags({ GetByIndexFailure: () => Effect.succeed(null) }));
        if (row === null) {
            return null;
        }
        const scheduler = yield* Scheduler;
        yield* kind === "transactions"
            ? scheduler.runAfter(Duration.zero, refs.internal.banking.pull, { id: row._id })
            : scheduler.runAfter(Duration.zero, refs.internal.banking.refreshAccount, { id: row._id });
        return null;
    }, Effect.orDie)
);

const pull = FunctionImpl.make(
    databaseSchema,
    spec,
    "pull",
    Effect.fn("Banking.pull")(
        function* pull({ id }) {
            const { runMutation } = yield* MutationRunner;
            const { runQuery } = yield* QueryRunner;
            const target = yield* runQuery(refs.internal.banking.pullTarget, { id });
            if (target === null || target.status !== "active") {
                return null;
            }
            const access = yield* runQuery(refs.internal.banking.accessFor, { userId: target.userId });
            if (access !== "allowed") {
                return null;
            }
            // The provider keeps the page until the phone drains the inbox; the next webhook pulls again.
            if (yield* runQuery(refs.internal.banking.inboxFull, { userId: target.userId })) {
                return null;
            }
            const configured = yield* configuredClients();
            const match = configured.find(({ name }) => name === target.provider);
            if (match === undefined) {
                return null;
            }
            const lease = yield* runMutation(refs.internal.banking.claimPull, { id });
            if (lease === null) {
                return null;
            }
            // Read the cursor under the lease: another pull may have moved it since the first read.
            const cursor = (yield* runQuery(refs.internal.banking.pullTarget, { id }))?.cursor ?? null;
            let advanced = false;
            return yield* Effect.gen(function* pullClaimed() {
                const outcome = yield* match.client.transactions(target.accountId, Option.fromNullishOr(cursor)).pipe(
                    Effect.map((page) => ({ kind: "page" as const, page })),
                    Effect.catchTags({
                        BankingError: (error) => {
                            if (error.reason === "relink" || error.reason === "disconnected") {
                                return runMutation(refs.internal.banking.setStatus, {
                                    id,
                                    status: error.reason,
                                }).pipe(Effect.as({ kind: "stopped" as const }));
                            }
                            return Console.warn("[banking] transaction pull failed", error).pipe(
                                Effect.as({ kind: "stopped" as const })
                            );
                        },
                    })
                );
                if (outcome.kind !== "page") {
                    return null;
                }
                const writes = outcome.page.transactions.flatMap((tx) => {
                    const write = toInboundWrite(
                        {
                            institution: target.institution,
                            last4: target.last4,
                            provider: target.provider,
                        },
                        tx
                    );
                    return write === null ? [] : [write];
                });
                // Queue before moving the cursor: a crash between the two replays the page instead of losing it.
                for (let start = 0; start < writes.length; start += WRITE_CHUNK) {
                    const queued = yield* runMutation(refs.internal.banking.queueWrites, {
                        id,
                        lease,
                        writes: writes.slice(start, start + WRITE_CHUNK),
                    });
                    if (!queued) {
                        return null;
                    }
                }
                advanced = yield* runMutation(refs.internal.banking.advanceCursor, {
                    from: cursor,
                    id,
                    lease,
                    to: Option.getOrNull(outcome.page.cursor),
                });
                return null;
            }).pipe(
                // A defect after the claim must not keep the account leased for ten minutes.
                Effect.ensuring(
                    Effect.suspend(() =>
                        advanced
                            ? Effect.void
                            : runMutation(refs.internal.banking.releasePull, { id, lease }).pipe(Effect.orDie)
                    )
                )
            );
        },
        Effect.provide(outboundHttp),
        Effect.orDie
    )
);

const refreshAccount = FunctionImpl.make(
    databaseSchema,
    spec,
    "refreshAccount",
    Effect.fn("Banking.refreshAccount")(
        function* refreshAccount({ id }) {
            const { runMutation } = yield* MutationRunner;
            const { runQuery } = yield* QueryRunner;
            const target = yield* runQuery(refs.internal.banking.pullTarget, { id });
            if (target === null) {
                return null;
            }
            const configured = yield* configuredClients();
            const match = configured.find(({ name }) => name === target.provider);
            if (match === undefined) {
                return null;
            }
            const status = yield* match.client.account(target.accountId).pipe(
                Effect.map((account) => account.status),
                Effect.catchTags({
                    BankingError: (error) => {
                        if (error.reason === "disconnected") {
                            return runMutation(refs.internal.banking.setStatus, { id, status: "disconnected" }).pipe(
                                Effect.as(null)
                            );
                        }
                        return Console.warn("[banking] account refresh failed", error).pipe(Effect.as(null));
                    },
                })
            );
            if (status === null) {
                return null;
            }
            yield* runMutation(refs.internal.banking.setStatus, { id, status });
            if (target.status !== "active" && status === "active") {
                const scheduler = yield* Scheduler;
                yield* scheduler.runAfter(Duration.zero, refs.internal.banking.pull, { id });
            }
            return null;
        },
        Effect.provide(outboundHttp),
        Effect.orDie
    )
);

const lapsed = FunctionImpl.make(
    databaseSchema,
    spec,
    "lapsed",
    Effect.fn("Banking.lapsed")(function* lapsed({ cursor }) {
        const ctx = yield* QueryCtx;
        const page = yield* (yield* DatabaseReader)
            .table("bankAccounts")
            .index("by_creation_time")
            .paginate({ cursor, numItems: LAPSED_SCAN });
        const configured = yield* configuredClients();
        const allowedByUser = new Map<string, boolean>();
        const ids = [];
        for (const row of page.page) {
            if (row.status === "disconnected") {
                continue;
            }
            const known = allowedByUser.get(row.userId);
            const allowed = known ?? (yield* accessForUser(ctx, row.userId, configured)) === "allowed";
            allowedByUser.set(row.userId, allowed);
            if (!allowed) {
                ids.push(row._id);
            }
        }
        return { cursor: page.isDone ? null : page.continueCursor, ids };
    }, Effect.orDie)
);

const sweep = FunctionImpl.make(
    databaseSchema,
    spec,
    "sweep",
    Effect.fn("Banking.sweep")(
        function* sweep({ cursor }) {
            const { runMutation } = yield* MutationRunner;
            const { runQuery } = yield* QueryRunner;
            const { cursor: next, ids } = yield* runQuery(refs.internal.banking.lapsed, { cursor });
            // Queue the next page before any disconnect: a page that fails halfway must not strand the rest.
            if (next !== null) {
                yield* (yield* Scheduler).runAfter(Duration.zero, refs.internal.banking.sweep, { cursor: next });
            }
            const configured = yield* configuredClients();
            for (const id of ids) {
                const target = yield* runQuery(refs.internal.banking.pullTarget, { id });
                if (target === null) {
                    continue;
                }
                // A renewal between lapsed and sweep must not cost the user a link.
                if ((yield* runQuery(refs.internal.banking.accessFor, { userId: target.userId })) === "allowed") {
                    continue;
                }
                const match = configured.find(({ name }) => name === target.provider);
                if (match === undefined) {
                    yield* Console.warn(`[banking] cannot disconnect ${target.provider}: not configured`);
                    continue;
                }
                const disconnected = yield* match.client.disconnect(target.accountId).pipe(
                    Effect.as(true),
                    Effect.catchTags({
                        BankingError: (error) =>
                            isAlreadyDisconnected(error)
                                ? Effect.succeed(true)
                                : Console.warn("[banking] disconnect failed", error).pipe(Effect.as(false)),
                    })
                );
                if (disconnected) {
                    yield* runMutation(refs.internal.banking.removeAccount, { id });
                }
            }
            return null;
        },
        Effect.provide(outboundHttp),
        Effect.orDie
    )
);

export default GroupImpl.make(databaseSchema, spec).pipe(
    Layer.provide(overview),
    Layer.provide(startLink),
    Layer.provide(finishLink),
    Layer.provide(unlink),
    Layer.provide(accessFor),
    Layer.provide(holderFor),
    Layer.provide(saveHolder),
    Layer.provide(saveAccounts),
    Layer.provide(pullTarget),
    Layer.provide(Layer.mergeAll(holdersOf, dropHolders, inboxFull)),
    Layer.provide(Layer.mergeAll(claimPull, queueWrites, releasePull)),
    Layer.provide(advanceCursor),
    Layer.provide(setStatus),
    Layer.provide(onEvent),
    Layer.provide(removeAccount),
    Layer.provide(pull),
    Layer.provide(refreshAccount),
    Layer.provide(lapsed),
    Layer.provide(sweep),
    GroupImpl.finalize
);
