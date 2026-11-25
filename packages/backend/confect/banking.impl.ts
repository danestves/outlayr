import { FunctionImpl, GroupImpl } from "@confect/server";
import type { Document, QueryInitializer } from "@confect/server";
import type { BankAccount, BankingProviderName } from "@outlayr/banking/provider";
import { bankingProviders } from "@outlayr/banking/registry";
import { isPerson } from "@outlayr/money/account-kind";
import { entryRow } from "@outlayr/money/entry-row";
import { fixedOffset, utcOffsetOf, zoneCalendar } from "@outlayr/money/ledger-zone";
import type { OffsetAt } from "@outlayr/money/ledger-zone";
import { matchCardAccount } from "@outlayr/money/match-card-account";
import type { RateLookup } from "@outlayr/money/rates";
import * as Clock from "effect/Clock";
import * as Console from "effect/Console";
import * as DateTime from "effect/DateTime";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import type { AccountsDoc, BankEntriesDoc, CategoriesDoc, TransactionsDoc } from "./_generated/docs";
import type { Id } from "./_generated/id";
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
import { BANK_DEVICE_ID, configuredClients, toBankEntry } from "./banking";
import type { BankEntry } from "./banking";
import spec from "./banking.spec";
import { BANKING_EFFECTIVE_AT_MS } from "./legal";
import { PURGE_BATCH } from "./lib/account";
import { requireUserId } from "./lib/auth";
import { authComponent } from "./lib/betterAuth";
import { dieAsConvexError } from "./lib/convexError";
import { outboundHttp } from "./lib/http";
import { scheduleCellRefresh } from "./lib/ledgerCells";
import { refuseWhileDeleting, seqCounter } from "./lib/syncGuards";
import { emitEntriesFiled } from "./lib/webhookEvents";
import type { FiledEntry } from "./lib/webhookEvents";
import { fold, keyedLocalId, MEMORY_WINDOW } from "./mcpEntries";
import { setting, storedZone } from "./mcpLedger.impl";
import { isPro } from "./revenuecat";

type Entitled = Parameters<typeof isPro>[0];

const WRITE_CHUNK = 100;
const LAPSED_SCAN = 25;
// Matches the action time limit, so a crashed pull blocks its account for one run at most.
const PULL_LEASE_MS = 10 * 60 * 1000;

type Configured = Effect.Success<ReturnType<typeof configuredClients>>[number];

const getById = <A>(effect: Effect.Effect<A, Document.DocumentDecodeError | QueryInitializer.GetByIdFailure>) =>
    effect.pipe(Effect.catchTags({ GetByIdFailure: () => Effect.succeed(null) }));

const getByIndex = <A>(effect: Effect.Effect<A, Document.DocumentDecodeError | QueryInitializer.GetByIndexFailure>) =>
    effect.pipe(Effect.catchTags({ GetByIndexFailure: () => Effect.succeed(null) }));

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
                    filesInto: row.filesInto ?? null,
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
        const row = yield* getByIndex(
            (yield* DatabaseReader).table("bankHolders").get("by_userId_and_provider", userId, provider)
        );
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
        const existing = yield* getByIndex(reader.table("bankHolders").get("by_userId_and_provider", userId, provider));
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

const displayNameOf = (account: { institution: string; last4: string | null; name: string }) => {
    const name = account.name.trim();
    const institution = account.institution.trim();
    const prefix = institution === "" || fold(name).includes(fold(institution)) ? "" : `${institution} `;
    const suffix = account.last4 === null ? "" : ` ••${account.last4}`;
    return `${prefix}${name}${suffix}`.trim();
};

const filesIntoFor = Effect.fn("Banking.filesIntoFor")(function* filesIntoFor(
    userId: string,
    provider: BankingProviderName,
    account: BankAccount,
    ledger: readonly AccountsDoc[],
    currency: string,
    seq: number,
    sortOrder: number,
    now: number
) {
    const display = displayNameOf(account);
    const matched = matchCardAccount(
        display,
        // Archived accounts are not part of the wallet the phone matches against either.
        ledger
            .filter((row) => !isPerson(row) && (row.archivedAt ?? null) === null)
            .map((row) => ({ id: row.localId, name: row.name }))
    );
    if (matched !== null) {
        return { created: false, filesInto: matched };
    }
    const localId = yield* keyedLocalId(userId, `bank-account:${provider}:${account.id}`);
    const known = yield* getByIndex(
        (yield* DatabaseReader).table("accounts").get("by_user_and_localId", userId, localId)
    );
    if (known !== null) {
        return { created: false, filesInto: known.deletedAt === null ? localId : null };
    }
    yield* (yield* DatabaseWriter).table("accounts").insert({
        currency,
        customColor: null,
        dateCreated: now,
        deletedAt: null,
        deviceId: BANK_DEVICE_ID,
        emoji: null,
        icon: null,
        imageColor: null,
        imageKey: null,
        initialBalance: 0,
        initialBalanceDate: now,
        initialBalanceUsd: 0,
        kind: account.kind === "credit" ? "liability" : "asset",
        localId,
        name: display,
        seq,
        sortOrder,
        updatedAt: now,
        userId,
    });
    return { created: true, filesInto: localId };
});

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
        const counter = yield* seqCounter(userId);
        const ledgerAccounts = (yield* reader
            .table("accounts")
            .index("by_user_and_seq", (q) => q.eq("userId", userId))
            .collect()).filter((row) => row.deletedAt === null);
        // No bank account carries a currency, so a created account takes the ledger's, which its entries convert from.
        const currency = (yield* setting(userId, "currency")) ?? "USD";
        const nextSortOrder = ledgerAccounts.reduce((highest, row) => Math.max(highest, row.sortOrder), -1) + 1;
        let created = 0;
        let saved = 0;
        for (const account of accounts) {
            const existing = yield* getByIndex(
                reader.table("bankAccounts").get("by_provider_and_accountId", provider, account.id)
            );
            if (existing !== null && existing.userId !== userId) {
                continue;
            }
            let id = existing?._id;
            let filesInto = existing?.filesInto ?? null;
            if (existing === null) {
                const linked = yield* filesIntoFor(
                    userId,
                    provider,
                    account,
                    ledgerAccounts,
                    currency,
                    counter.nextSeq + created,
                    nextSortOrder + created,
                    now
                );
                const { created: madeAccount, filesInto: linkedInto } = linked;
                if (madeAccount) {
                    created += 1;
                }
                filesInto = linkedInto;
                id = yield* writer.table("bankAccounts").insert({
                    accountId: account.id,
                    filesInto,
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
        if (created > 0) {
            yield* counter.advanceTo(counter.nextSeq + created);
        }
        return saved;
    }, Effect.orDie)
);

const setFilesInto = FunctionImpl.make(
    databaseSchema,
    spec,
    "setFilesInto",
    Effect.fn("Banking.setFilesInto")(
        function* setFilesInto({ accountId, id }) {
            const userId = yield* requireUserId(yield* MutationCtx);
            const reader = yield* DatabaseReader;
            const row = yield* getById(reader.table("bankAccounts").get(id));
            if (row === null || row.userId !== userId) {
                return false;
            }
            if (accountId !== null) {
                const account = yield* getByIndex(
                    reader.table("accounts").get("by_user_and_localId", userId, accountId)
                );
                if (account === null || account.deletedAt !== null) {
                    return false;
                }
            }
            yield* (yield* DatabaseWriter).table("bankAccounts").patch(id, { filesInto: accountId });
            return true;
        },
        Effect.catchTags({ Unauthenticated: dieAsConvexError }),
        Effect.orDie
    )
);

const pullTarget = FunctionImpl.make(
    databaseSchema,
    spec,
    "pullTarget",
    Effect.fn("Banking.pullTarget")(function* pullTarget({ id }) {
        const row = yield* getById((yield* DatabaseReader).table("bankAccounts").get(id));
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

const claimPull = FunctionImpl.make(
    databaseSchema,
    spec,
    "claimPull",
    Effect.fn("Banking.claimPull")(function* claimPull({ id }) {
        const reader = yield* DatabaseReader;
        const row = yield* getById(reader.table("bankAccounts").get(id));
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

const newestRowOffset = Effect.fn("Banking.newestRowOffset")(function* newestRowOffset(userId: string) {
    const latest = yield* (yield* DatabaseReader)
        .table("transactions")
        .index("by_user_and_seq", (q) => q.eq("userId", userId), "desc")
        .first();
    return fixedOffset(Option.match(latest, { onNone: () => 0, onSome: (row) => utcOffsetOf(row.day) }));
});

interface Remembered {
    categoryId: string;
    date: number;
}

const categoryMemory = (
    rows: readonly {
        date: number;
        deletedAt: number | null;
        categoryId: string | null;
        income: boolean;
        note: string;
    }[]
) => {
    const remembered = new Map<string, Remembered>();
    for (const row of rows) {
        if (row.deletedAt !== null || row.categoryId === null) {
            continue;
        }
        const key = `${row.income ? "in" : "out"}:${fold(row.note)}`;
        const best = remembered.get(key);
        if (best === undefined || row.date > best.date) {
            remembered.set(key, { categoryId: row.categoryId, date: row.date });
        }
    }
    return remembered;
};

interface FilingCount {
    entries: FiledEntry[];
    instants: number[];
    // Rows the server wrote, not just new ones: a patch or a tombstone needs a fresh seq to reach the other devices.
    written: number;
}

interface Filing {
    bankAccountId: Id<"bankAccounts">;
    categories: readonly CategoriesDoc[];
    filed: FilingCount;
    filesInto: string | null;
    ledgerCurrency: string;
    lookup: RateLookup;
    now: number;
    offsetAt: OffsetAt;
    remembered: ReadonlyMap<string, Remembered>;
    seq: number;
    userId: string;
}

const recordMatches = (record: BankEntriesDoc, entry: BankEntry) =>
    record.amount === entry.amount &&
    record.date === entry.date &&
    record.note === entry.note &&
    record.status === entry.status;

const writeBankRecord = Effect.fn("Banking.writeBankRecord")(function* writeBankRecord(
    filing: Filing,
    entry: BankEntry,
    localId: string,
    record: BankEntriesDoc | null
) {
    if (record !== null) {
        yield* (yield* DatabaseWriter).table("bankEntries").patch(record._id, {
            amount: entry.amount,
            date: entry.date,
            note: entry.note,
            status: entry.status,
        });
        return;
    }
    yield* (yield* DatabaseWriter).table("bankEntries").insert({
        amount: entry.amount,
        bankAccountId: filing.bankAccountId,
        date: entry.date,
        key: entry.key,
        localId,
        note: entry.note,
        status: entry.status,
        userId: filing.userId,
    });
});

const fileNewEntry = Effect.fn("Banking.fileNewEntry")(function* fileNewEntry(
    filing: Filing,
    entry: BankEntry,
    localId: string,
    record: BankEntriesDoc | null
) {
    const rememberedId = filing.remembered.get(`${entry.income ? "in" : "out"}:${fold(entry.note)}`)?.categoryId;
    const categoryId =
        rememberedId ??
        filing.categories.find((candidate) => candidate.income === entry.income && candidate.parentId === null)
            ?.localId ??
        null;
    const category = filing.categories.find((candidate) => candidate.localId === categoryId);
    if (category === undefined) {
        return;
    }
    const written = yield* entryRow(
        filing.lookup,
        localId,
        {
            accountId: filing.filesInto,
            amount: entry.amount,
            categoryId: category.localId,
            currency: entry.currency,
            date: DateTime.toDate(DateTime.makeUnsafe(entry.date)),
            details: null,
            income: entry.income,
            note: entry.note,
        },
        {
            calendar: zoneCalendar(filing.offsetAt),
            categoryName: category.name,
            currency: entry.currency,
            now: DateTime.toDate(DateTime.makeUnsafe(filing.now)),
        }
    );
    yield* (yield* DatabaseWriter).table("transactions").insert({
        accountId: written.accountId,
        amount: written.amount,
        amountUsd: written.amountUsd,
        categoryId: written.categoryId,
        createdBy: null,
        currency: written.currency,
        customColor: written.customColor,
        date: entry.date,
        day: written.day.getTime(),
        deletedAt: null,
        details: written.details,
        deviceId: BANK_DEVICE_ID,
        emoji: written.emoji,
        exchangeRate: written.exchangeRate,
        exchangeRateType: written.exchangeRateType,
        feeForId: null,
        feeRate: null,
        icon: written.icon,
        imageColor: written.imageColor,
        imageKey: null,
        income: written.income,
        installmentId: null,
        localId,
        month: written.month.getTime(),
        note: written.note,
        onceRecurring: written.onceRecurring,
        paidVia: null,
        receipt: null,
        recurringAnchorDay: written.recurringAnchorDay,
        recurringCoefficient: written.recurringCoefficient,
        recurringEndDate: null,
        recurringType: written.recurringType,
        seq: filing.seq + filing.filed.written,
        transferId: null,
        unreviewed: false,
        updatedAt: filing.now,
        userId: filing.userId,
    });
    filing.filed.written += 1;
    filing.filed.instants.push(entry.date);
    filing.filed.entries.push({
        accountId: written.accountId,
        amount: written.amount,
        categoryId: written.categoryId,
        currency: written.currency,
        date: entry.date,
        income: written.income,
        localId,
        note: written.note,
        updatedAt: filing.now,
    });
    yield* writeBankRecord(filing, entry, localId, record);
});

const rewriteEntry = Effect.fn("Banking.rewriteEntry")(function* rewriteEntry(
    filing: Filing,
    entry: BankEntry,
    existing: TransactionsDoc,
    record: BankEntriesDoc | null
) {
    // The record is missing after an unlink; the row is already the one this key names, so its edits stay.
    if (record === null) {
        yield* writeBankRecord(filing, entry, existing.localId, record);
        return;
    }
    const amount = existing.amount === record.amount ? entry.amount : existing.amount;
    const date = existing.date === record.date ? entry.date : existing.date;
    const note = existing.note === record.note ? entry.note : existing.note;
    if (amount !== existing.amount || date !== existing.date || note !== existing.note) {
        const category = filing.categories.find((candidate) => candidate.localId === existing.categoryId);
        // A custom rate is the user's, so it survives while an official one follows the date the bank moved.
        const storedType = existing.exchangeRateType;
        const rateType =
            storedType === "custom" || storedType === "official" || storedType === "eur_reference" ? storedType : null;
        const written = yield* entryRow(
            filing.lookup,
            existing.localId,
            {
                accountId: existing.accountId ?? null,
                amount,
                categoryId: existing.categoryId,
                currency: existing.currency,
                date: DateTime.toDate(DateTime.makeUnsafe(date)),
                details: existing.details,
                exchangeRate: rateType === "custom" ? existing.exchangeRate : undefined,
                exchangeRateType: rateType,
                income: existing.income,
                note,
            },
            {
                calendar: zoneCalendar(filing.offsetAt),
                categoryName: category?.name ?? null,
                currency: filing.ledgerCurrency,
                now: DateTime.toDate(DateTime.makeUnsafe(filing.now)),
            }
        );
        yield* (yield* DatabaseWriter).table("transactions").patch(existing._id, {
            amount: written.amount,
            amountUsd: written.amountUsd,
            date,
            day: written.day.getTime(),
            exchangeRate: written.exchangeRate,
            exchangeRateType: written.exchangeRateType,
            month: written.month.getTime(),
            note: written.note,
            seq: filing.seq + filing.filed.written,
            // Ahead of the row the user edited, behind their next edit, so a whole-row sync edit still wins.
            updatedAt: existing.updatedAt + 1,
        });
        filing.filed.written += 1;
        if (amount !== existing.amount || date !== existing.date) {
            filing.filed.instants.push(date);
            if (date !== existing.date) {
                filing.filed.instants.push(existing.date);
            }
        }
    }
    yield* writeBankRecord(filing, entry, existing.localId, record);
});

const fileTransactions = FunctionImpl.make(
    databaseSchema,
    spec,
    "fileTransactions",
    Effect.fn("Banking.fileTransactions")(function* fileTransactions({ id, lease, txs }) {
        const ctx = yield* MutationCtx;
        const reader = yield* DatabaseReader;
        const row = yield* getById(reader.table("bankAccounts").get(id));
        if (row === null || row.pullLease?.token !== lease || (yield* deletingAccount(row.userId))) {
            return false;
        }
        // No synced ledger means no categories or accounts to file into; the cursor stays so a link finishes later.
        const state = yield* getByIndex(reader.table("syncState").get("by_user", row.userId));
        if (state === null) {
            return false;
        }
        const [categoryRows, accountRows] = yield* Effect.all(
            [
                reader
                    .table("categories")
                    .index("by_user_and_seq", (q) => q.eq("userId", row.userId))
                    .collect(),
                reader
                    .table("accounts")
                    .index("by_user_and_seq", (q) => q.eq("userId", row.userId))
                    .collect(),
            ],
            { concurrency: "unbounded" }
        );
        const categories = categoryRows.filter((category) => category.deletedAt === null);
        // Filing now would drop every entry and the cursor would move past them for good.
        if (categories.length === 0) {
            return false;
        }
        const remembered = categoryMemory(
            (yield* reader
                .table("transactions")
                .index("by_user_and_seq", (q) => q.eq("userId", row.userId), "desc")
                .take(MEMORY_WINDOW)).filter(
                (entry) =>
                    entry.categoryId !== null && categories.some((category) => category.localId === entry.categoryId)
            )
        );
        const filesInto = row.filesInto ?? null;
        const into =
            filesInto === null
                ? null
                : (accountRows.find((account) => account.localId === filesInto && account.deletedAt === null) ?? null);
        const counter = yield* seqCounter(row.userId);
        const filing: Filing = {
            bankAccountId: id,
            categories,
            filed: { entries: [], instants: [], written: 0 },
            filesInto: into?.localId ?? null,
            ledgerCurrency: (yield* setting(row.userId, "currency")) ?? "USD",
            lookup: (quote, rateType, day) =>
                Effect.promise(() =>
                    ctx.db
                        .query("exchangeRates")
                        .withIndex("by_quote_and_rateType_and_date", (q) =>
                            q.eq("quote", quote).eq("rateType", rateType).lte("date", day)
                        )
                        .order("desc")
                        .first()
                ),
            now: yield* Clock.currentTimeMillis,
            offsetAt: (yield* storedZone(row.userId)) ?? (yield* newestRowOffset(row.userId)),
            remembered,
            seq: counter.nextSeq,
            userId: row.userId,
        };

        for (const tx of txs) {
            const entry = toBankEntry(row.provider, tx);
            if (entry === null) {
                continue;
            }
            const localId = yield* keyedLocalId(row.userId, entry.key);
            const record = yield* getByIndex(reader.table("bankEntries").get("by_userId", row.userId, entry.key));
            if (record !== null && recordMatches(record, entry)) {
                continue;
            }
            const existing = yield* getByIndex(
                reader.table("transactions").get("by_user_and_localId", row.userId, localId)
            );
            if (entry.status === "void") {
                if (existing !== null && existing.deletedAt === null) {
                    yield* (yield* DatabaseWriter).table("transactions").patch(existing._id, {
                        deletedAt: filing.now,
                        seq: filing.seq + filing.filed.written,
                    });
                    filing.filed.written += 1;
                    filing.filed.instants.push(existing.date);
                }
                if (record !== null || existing !== null) {
                    yield* writeBankRecord(filing, entry, localId, record);
                }
                continue;
            }
            // A row the user deleted stays deleted; only the record moves so a later bank edit is judged against it.
            if (existing !== null && existing.deletedAt !== null) {
                yield* writeBankRecord(filing, entry, localId, record);
                continue;
            }
            yield* existing === null
                ? fileNewEntry(filing, entry, localId, record)
                : rewriteEntry(filing, entry, existing, record);
        }

        if (filing.filed.written > 0) {
            yield* counter.advanceTo(counter.nextSeq + filing.filed.written);
            yield* scheduleCellRefresh(row.userId, counter.cells, filing.filed.instants);
            yield* emitEntriesFiled(row.userId, filing.filed.entries, filing.now);
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
        const row = yield* getById(reader.table("bankAccounts").get(id));
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
        const row = yield* getById(reader.table("bankAccounts").get(id));
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
        const row = yield* getById((yield* DatabaseReader).table("bankAccounts").get(id));
        if (row !== null) {
            yield* (yield* DatabaseWriter).table("bankAccounts").patch(id, { status });
        }
        return null;
    }, Effect.orDie)
);

const dropBankEntriesBatch = Effect.fn("Banking.dropBankEntriesBatch")(function* dropBankEntriesBatch(
    bankAccountId: Id<"bankAccounts">
) {
    const reader = yield* DatabaseReader;
    const writer = yield* DatabaseWriter;
    const queued = yield* reader
        .table("bankEntries")
        .index("by_bankAccountId", (q) => q.eq("bankAccountId", bankAccountId))
        .take(PURGE_BATCH);
    for (const entry of queued) {
        yield* writer.table("bankEntries").delete(entry._id);
    }
    if (queued.length >= PURGE_BATCH) {
        yield* (yield* Scheduler).runAfter(Duration.zero, refs.internal.banking.dropBankEntries, {
            bankAccountId,
        });
    }
});

const dropBankEntries = FunctionImpl.make(
    databaseSchema,
    spec,
    "dropBankEntries",
    Effect.fn("Banking.dropBankEntries")(function* dropBankEntries({ bankAccountId }) {
        yield* dropBankEntriesBatch(bankAccountId);
        return null;
    }, Effect.orDie)
);

const removeAccount = FunctionImpl.make(
    databaseSchema,
    spec,
    "removeAccount",
    Effect.fn("Banking.removeAccount")(function* removeAccount({ id }) {
        const row = yield* getById((yield* DatabaseReader).table("bankAccounts").get(id));
        if (row !== null) {
            yield* (yield* DatabaseWriter).table("bankAccounts").delete(id);
        }
        yield* dropBankEntriesBatch(id);
        return null;
    }, Effect.orDie)
);

const onEvent = FunctionImpl.make(
    databaseSchema,
    spec,
    "onEvent",
    Effect.fn("Banking.onEvent")(function* onEvent({ accountId, kind, provider }) {
        const row = yield* getByIndex(
            (yield* DatabaseReader).table("bankAccounts").get("by_provider_and_accountId", provider, accountId)
        );
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
                // File before moving the cursor: a crash between the two replays the page instead of losing it.
                for (let start = 0; start < outcome.page.transactions.length; start += WRITE_CHUNK) {
                    const filed = yield* runMutation(refs.internal.banking.fileTransactions, {
                        id,
                        lease,
                        txs: outcome.page.transactions.slice(start, start + WRITE_CHUNK),
                    });
                    if (!filed) {
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
    Layer.provide(setFilesInto),
    Layer.provide(accessFor),
    Layer.provide(holderFor),
    Layer.provide(saveHolder),
    Layer.provide(saveAccounts),
    Layer.provide(pullTarget),
    Layer.provide(Layer.mergeAll(holdersOf, dropHolders)),
    Layer.provide(Layer.mergeAll(claimPull, fileTransactions, releasePull)),
    Layer.provide(advanceCursor),
    Layer.provide(Layer.mergeAll(removeAccount, dropBankEntries)),
    Layer.provide(Layer.mergeAll(setStatus, onEvent)),
    Layer.provide(pull),
    Layer.provide(refreshAccount),
    Layer.provide(lapsed),
    Layer.provide(sweep),
    GroupImpl.finalize
);
