import type { LedgerBooks } from "@outlayr/backend/confect/ledgerView";
import { api } from "@outlayr/backend/convex/_generated/api";
import { convexCollectionOptions, convexPaginatedCollectionOptions } from "@tanstack/convex-db-collection";
import type { ConvexCollectionClient } from "@tanstack/convex-db-collection";
import { collectionOptions, useLiveQuery } from "@tanstack/react-db";
import type { Collection, CollectionOptions, DbClient, NonSingleResult, UtilsRecord } from "@tanstack/react-db";
import type { FunctionReturnType } from "convex/server";
import { ConvexError } from "convex/values";
import { useMemo } from "react";

import { CONVEX } from "./db";
import { pushRows } from "./ledger-write";

const PAGE_SIZE = 1000;
const MAX_ROWS = 100_000;

const convexOf = (db: DbClient) => db.requireDependency<ConvexCollectionClient>(CONVEX);

const paged = { maxRows: MAX_ROWS, pageSize: PAGE_SIZE };

type PulledRow = FunctionReturnType<typeof api.sync.pullSince>["rows"][number];

export interface MetaRow {
    key: string;
    updatedAt: number;
    value: string | null;
}

const metaOf = (row: PulledRow): MetaRow => ({
    key: row.localId,
    updatedAt: row.updatedAt,
    // oxlint-disable-next-line anti-slop/no-runtime-typeof -- pullSince types every table's fields loosely; this is the boundary.
    value: typeof row.fields.value === "string" ? row.fields.value : null,
});

const pushMeta = (db: DbClient, mutations: readonly { modified: MetaRow }[]) =>
    pushRows(
        db,
        mutations.map(({ modified }) => ({
            deletedAt: null,
            fields: { value: modified.value },
            localId: modified.key,
            table: "appMeta",
            updatedAt: modified.updatedAt,
        }))
    );

type Loadable = Pick<Collection, "preload" | "reload" | "status">;

const start = (collection: Loadable) => (collection.status === "error" ? collection.reload() : collection.preload());

const RETRY_WAITS_MS = [500, 1500, 4000, 8000];

// A busy server can time one of these queries out at Convex's 1 s limit, and one failure must not sink the page.
// A ConvexError is a refusal (no Pro, signed out), which would only say the same thing again.
const load = async (collection: Loadable) => {
    for (const wait of RETRY_WAITS_MS) {
        try {
            // oxlint-disable-next-line no-await-in-loop -- each try waits on the one before it.
            return await start(collection);
        } catch (error) {
            if (error instanceof ConvexError) {
                throw error;
            }
            // oxlint-disable-next-line no-await-in-loop -- the wait is the point.
            await new Promise((resolve) => {
                setTimeout(resolve, wait);
            });
        }
    }
    return start(collection);
};

type TagTable = "tags" | "transactionTags";

const openers: ((db: DbClient) => Loadable)[] = [];

const ledgerTable = <Row extends object, Key extends string | number, Utils extends UtilsRecord>(
    options: CollectionOptions<Row, Key, never, Utils> & NonSingleResult
) => {
    openers.push((db) => db.collection(options));
    return options;
};

export const ledgerCollections = {
    accounts: ledgerTable(
        collectionOptions("ledger.accounts", (db) =>
            convexCollectionOptions({
                client: convexOf(db),
                getKey: (row) => row.localId,
                queryArgs: {},
                id: "ledger.accounts",
                query: api.ledger.accounts,
            })
        )
    ),
    appMeta: ledgerTable(
        collectionOptions("ledger.appMeta", (db) =>
            convexCollectionOptions<typeof api.sync.pullSince, MetaRow, string>({
                client: convexOf(db),
                getKey: (row) => row.key,
                id: "ledger.appMeta",
                query: api.sync.pullSince,
                queryArgs: { cursor: 0, tables: ["appMeta"] },
                select: (page) => page.rows.map(metaOf),
                onInsert: ({ transaction }) => pushMeta(db, transaction.mutations),
                onUpdate: ({ transaction }) => pushMeta(db, transaction.mutations),
            })
        )
    ),
    budgets: ledgerTable(
        collectionOptions("ledger.budgets", (db) =>
            convexCollectionOptions({
                client: convexOf(db),
                getKey: (row) => row.localId,
                queryArgs: {},
                id: "ledger.budgets",
                query: api.ledger.budgets,
            })
        )
    ),
    categories: ledgerTable(
        collectionOptions("ledger.categories", (db) =>
            convexCollectionOptions({
                client: convexOf(db),
                getKey: (row) => row.localId,
                queryArgs: {},
                id: "ledger.categories",
                query: api.ledger.categories,
            })
        )
    ),
    exchangeRates: ledgerTable(
        collectionOptions("ledger.exchangeRates", (db) =>
            convexCollectionOptions({
                client: convexOf(db),
                getKey: (row) => row._id,
                queryArgs: {},
                id: "ledger.exchangeRates",
                query: api.ledger.exchangeRates,
            })
        )
    ),
    installmentPlans: ledgerTable(
        collectionOptions("ledger.installmentPlans", (db) =>
            convexCollectionOptions({
                client: convexOf(db),
                getKey: (row) => row.localId,
                queryArgs: {},
                id: "ledger.installmentPlans",
                query: api.ledger.installmentPlans,
            })
        )
    ),
    installments: ledgerTable(
        collectionOptions("ledger.installments", (db) =>
            convexCollectionOptions({
                client: convexOf(db),
                getKey: (row) => row.localId,
                queryArgs: {},
                id: "ledger.installments",
                query: api.ledger.installments,
            })
        )
    ),
    mainBudget: ledgerTable(
        collectionOptions("ledger.mainBudget", (db) =>
            convexCollectionOptions({
                client: convexOf(db),
                getKey: (row) => row.localId,
                queryArgs: {},
                id: "ledger.mainBudget",
                query: api.ledger.mainBudget,
            })
        )
    ),
    outsideMoves: ledgerTable(
        collectionOptions("ledger.outsideMoves", (db) =>
            convexCollectionOptions({
                client: convexOf(db),
                getKey: (row) => row.localId,
                queryArgs: {},
                id: "ledger.outsideMoves",
                query: api.ledger.outsideMoves,
            })
        )
    ),
    outsidePayments: ledgerTable(
        collectionOptions("ledger.outsidePayments", (db) =>
            convexCollectionOptions({
                client: convexOf(db),
                getKey: (row) => row.localId,
                queryArgs: {},
                id: "ledger.outsidePayments",
                query: api.ledger.outsidePayments,
            })
        )
    ),
    savingsGoals: ledgerTable(
        collectionOptions("ledger.savingsGoals", (db) =>
            convexCollectionOptions({
                client: convexOf(db),
                getKey: (row) => row.localId,
                queryArgs: {},
                id: "ledger.savingsGoals",
                query: api.ledger.savingsGoals,
            })
        )
    ),
    tags: ledgerTable(
        collectionOptions("ledger.tags", (db) =>
            convexCollectionOptions({
                client: convexOf(db),
                getKey: (row) => row.localId,
                queryArgs: {},
                id: "ledger.tags",
                query: api.ledger.tags,
            })
        )
    ),
    transactionTags: ledgerTable(
        collectionOptions("ledger.transactionTags", (db) =>
            convexPaginatedCollectionOptions({
                ...paged,
                client: convexOf(db),
                getKey: (row) => row.localId,
                queryArgs: {},
                id: "ledger.transactionTags",
                query: api.ledger.transactionTags,
            })
        )
    ),
    transactions: ledgerTable(
        collectionOptions("ledger.transactions", (db) =>
            convexPaginatedCollectionOptions({
                ...paged,
                client: convexOf(db),
                getKey: (row) => row.localId,
                queryArgs: {},
                id: "ledger.transactions",
                query: api.ledger.transactions,
            })
        )
    ),
    transfers: ledgerTable(
        collectionOptions("ledger.transfers", (db) =>
            convexPaginatedCollectionOptions({
                ...paged,
                client: convexOf(db),
                getKey: (row) => row.localId,
                queryArgs: {},
                id: "ledger.transfers",
                query: api.ledger.transfers,
            })
        )
    ),
} satisfies Record<keyof LedgerBooks | TagTable, { id: string }>;

export const preloadLedger = (db: DbClient) => Promise.all(openers.map((open) => load(open(db))));

const rowsOf = <Row extends object, Key extends string | number, Utils extends UtilsRecord>(
    db: DbClient,
    options: CollectionOptions<Row, Key, never, Utils> & NonSingleResult
) => db.collection(options).toArray;

function useRows<Row extends object, Key extends string | number, Utils extends UtilsRecord>(
    options: CollectionOptions<Row, Key, never, Utils> & NonSingleResult
) {
    return useLiveQuery({ query: (q) => q.from({ row: options }), queryKey: [options.id] }).data;
}

export const ledgerBooks = (db: DbClient): LedgerBooks => ({
    accounts: rowsOf(db, ledgerCollections.accounts),
    appMeta: rowsOf(db, ledgerCollections.appMeta),
    budgets: rowsOf(db, ledgerCollections.budgets),
    categories: rowsOf(db, ledgerCollections.categories),
    exchangeRates: rowsOf(db, ledgerCollections.exchangeRates),
    installmentPlans: rowsOf(db, ledgerCollections.installmentPlans),
    installments: rowsOf(db, ledgerCollections.installments),
    mainBudget: rowsOf(db, ledgerCollections.mainBudget),
    outsideMoves: rowsOf(db, ledgerCollections.outsideMoves),
    outsidePayments: rowsOf(db, ledgerCollections.outsidePayments),
    savingsGoals: rowsOf(db, ledgerCollections.savingsGoals),
    transactions: rowsOf(db, ledgerCollections.transactions),
    transfers: rowsOf(db, ledgerCollections.transfers),
});

export function useLedgerBooks(): LedgerBooks {
    const accounts = useRows(ledgerCollections.accounts);
    const appMeta = useRows(ledgerCollections.appMeta);
    const budgets = useRows(ledgerCollections.budgets);
    const categories = useRows(ledgerCollections.categories);
    const exchangeRates = useRows(ledgerCollections.exchangeRates);
    const installmentPlans = useRows(ledgerCollections.installmentPlans);
    const installments = useRows(ledgerCollections.installments);
    const mainBudget = useRows(ledgerCollections.mainBudget);
    const outsideMoves = useRows(ledgerCollections.outsideMoves);
    const outsidePayments = useRows(ledgerCollections.outsidePayments);
    const savingsGoals = useRows(ledgerCollections.savingsGoals);
    const transactions = useRows(ledgerCollections.transactions);
    const transfers = useRows(ledgerCollections.transfers);
    return useMemo(
        () => ({
            accounts,
            appMeta,
            budgets,
            categories,
            exchangeRates,
            installmentPlans,
            installments,
            mainBudget,
            outsideMoves,
            outsidePayments,
            savingsGoals,
            transactions,
            transfers,
        }),
        [
            accounts,
            appMeta,
            budgets,
            categories,
            exchangeRates,
            installmentPlans,
            installments,
            mainBudget,
            outsideMoves,
            outsidePayments,
            savingsGoals,
            transactions,
            transfers,
        ]
    );
}

export type Tag = FunctionReturnType<typeof api.ledger.tags>[number];
export type TagLink = FunctionReturnType<typeof api.ledger.transactionTags>["page"][number];

export interface TagBooks {
    links: readonly TagLink[];
    tags: readonly Tag[];
}

export const tagBooks = (db: DbClient): TagBooks => ({
    links: rowsOf(db, ledgerCollections.transactionTags),
    tags: rowsOf(db, ledgerCollections.tags),
});

export function useTagBooks(): TagBooks {
    const links = useRows(ledgerCollections.transactionTags);
    const tags = useRows(ledgerCollections.tags);
    return useMemo(() => ({ links, tags }), [links, tags]);
}
