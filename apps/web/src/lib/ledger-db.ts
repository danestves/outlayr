import type { LedgerBooks } from "@outlayr/backend/confect/ledgerView";
import { api } from "@outlayr/backend/convex/_generated/api";
import { convexCollectionOptions, convexPaginatedCollectionOptions } from "@tanstack/convex-db-collection";
import type { ConvexCollectionClient } from "@tanstack/convex-db-collection";
import { collectionOptions, useLiveQuery } from "@tanstack/react-db";
import type { Collection, DbClient } from "@tanstack/react-db";
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

export const ledgerCollections = {
    accounts: collectionOptions("ledger.accounts", (db) =>
        convexCollectionOptions({
            client: convexOf(db),
            getKey: (row) => row.localId,
            queryArgs: {},
            id: "ledger.accounts",
            query: api.ledger.accounts,
        })
    ),
    appMeta: collectionOptions("ledger.appMeta", (db) =>
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
    ),
    budgets: collectionOptions("ledger.budgets", (db) =>
        convexCollectionOptions({
            client: convexOf(db),
            getKey: (row) => row.localId,
            queryArgs: {},
            id: "ledger.budgets",
            query: api.ledger.budgets,
        })
    ),
    categories: collectionOptions("ledger.categories", (db) =>
        convexCollectionOptions({
            client: convexOf(db),
            getKey: (row) => row.localId,
            queryArgs: {},
            id: "ledger.categories",
            query: api.ledger.categories,
        })
    ),
    exchangeRates: collectionOptions("ledger.exchangeRates", (db) =>
        convexCollectionOptions({
            client: convexOf(db),
            getKey: (row) => row._id,
            queryArgs: {},
            id: "ledger.exchangeRates",
            query: api.ledger.exchangeRates,
        })
    ),
    installmentPlans: collectionOptions("ledger.installmentPlans", (db) =>
        convexCollectionOptions({
            client: convexOf(db),
            getKey: (row) => row.localId,
            queryArgs: {},
            id: "ledger.installmentPlans",
            query: api.ledger.installmentPlans,
        })
    ),
    installments: collectionOptions("ledger.installments", (db) =>
        convexCollectionOptions({
            client: convexOf(db),
            getKey: (row) => row.localId,
            queryArgs: {},
            id: "ledger.installments",
            query: api.ledger.installments,
        })
    ),
    mainBudget: collectionOptions("ledger.mainBudget", (db) =>
        convexCollectionOptions({
            client: convexOf(db),
            getKey: (row) => row.localId,
            queryArgs: {},
            id: "ledger.mainBudget",
            query: api.ledger.mainBudget,
        })
    ),
    outsideMoves: collectionOptions("ledger.outsideMoves", (db) =>
        convexCollectionOptions({
            client: convexOf(db),
            getKey: (row) => row.localId,
            queryArgs: {},
            id: "ledger.outsideMoves",
            query: api.ledger.outsideMoves,
        })
    ),
    outsidePayments: collectionOptions("ledger.outsidePayments", (db) =>
        convexCollectionOptions({
            client: convexOf(db),
            getKey: (row) => row.localId,
            queryArgs: {},
            id: "ledger.outsidePayments",
            query: api.ledger.outsidePayments,
        })
    ),
    savingsGoals: collectionOptions("ledger.savingsGoals", (db) =>
        convexCollectionOptions({
            client: convexOf(db),
            getKey: (row) => row.localId,
            queryArgs: {},
            id: "ledger.savingsGoals",
            query: api.ledger.savingsGoals,
        })
    ),
    transactions: collectionOptions("ledger.transactions", (db) =>
        convexPaginatedCollectionOptions({
            ...paged,
            client: convexOf(db),
            getKey: (row) => row.localId,
            queryArgs: {},
            id: "ledger.transactions",
            query: api.ledger.transactions,
        })
    ),
    transfers: collectionOptions("ledger.transfers", (db) =>
        convexPaginatedCollectionOptions({
            ...paged,
            client: convexOf(db),
            getKey: (row) => row.localId,
            queryArgs: {},
            id: "ledger.transfers",
            query: api.ledger.transfers,
        })
    ),
};

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

export const preloadLedger = (db: DbClient) =>
    Promise.all([
        load(db.collection(ledgerCollections.accounts)),
        load(db.collection(ledgerCollections.appMeta)),
        load(db.collection(ledgerCollections.budgets)),
        load(db.collection(ledgerCollections.categories)),
        load(db.collection(ledgerCollections.exchangeRates)),
        load(db.collection(ledgerCollections.installmentPlans)),
        load(db.collection(ledgerCollections.installments)),
        load(db.collection(ledgerCollections.mainBudget)),
        load(db.collection(ledgerCollections.outsideMoves)),
        load(db.collection(ledgerCollections.outsidePayments)),
        load(db.collection(ledgerCollections.savingsGoals)),
        load(db.collection(ledgerCollections.transactions)),
        load(db.collection(ledgerCollections.transfers)),
    ]);

export const ledgerBooks = (db: DbClient): LedgerBooks => ({
    accounts: db.collection(ledgerCollections.accounts).toArray,
    appMeta: db.collection(ledgerCollections.appMeta).toArray,
    budgets: db.collection(ledgerCollections.budgets).toArray,
    categories: db.collection(ledgerCollections.categories).toArray,
    exchangeRates: db.collection(ledgerCollections.exchangeRates).toArray,
    installmentPlans: db.collection(ledgerCollections.installmentPlans).toArray,
    installments: db.collection(ledgerCollections.installments).toArray,
    mainBudget: db.collection(ledgerCollections.mainBudget).toArray,
    outsideMoves: db.collection(ledgerCollections.outsideMoves).toArray,
    outsidePayments: db.collection(ledgerCollections.outsidePayments).toArray,
    savingsGoals: db.collection(ledgerCollections.savingsGoals).toArray,
    transactions: db.collection(ledgerCollections.transactions).toArray,
    transfers: db.collection(ledgerCollections.transfers).toArray,
});

export function useLedgerBooks(): LedgerBooks {
    const accounts = useLiveQuery({
        query: (q) => q.from({ row: ledgerCollections.accounts }),
        queryKey: ["ledger.accounts"],
    }).data;
    const appMeta = useLiveQuery({
        query: (q) => q.from({ row: ledgerCollections.appMeta }),
        queryKey: ["ledger.appMeta"],
    }).data;
    const budgets = useLiveQuery({
        query: (q) => q.from({ row: ledgerCollections.budgets }),
        queryKey: ["ledger.budgets"],
    }).data;
    const categories = useLiveQuery({
        query: (q) => q.from({ row: ledgerCollections.categories }),
        queryKey: ["ledger.categories"],
    }).data;
    const exchangeRates = useLiveQuery({
        query: (q) => q.from({ row: ledgerCollections.exchangeRates }),
        queryKey: ["ledger.exchangeRates"],
    }).data;
    const installmentPlans = useLiveQuery({
        query: (q) => q.from({ row: ledgerCollections.installmentPlans }),
        queryKey: ["ledger.installmentPlans"],
    }).data;
    const installments = useLiveQuery({
        query: (q) => q.from({ row: ledgerCollections.installments }),
        queryKey: ["ledger.installments"],
    }).data;
    const mainBudget = useLiveQuery({
        query: (q) => q.from({ row: ledgerCollections.mainBudget }),
        queryKey: ["ledger.mainBudget"],
    }).data;
    const outsideMoves = useLiveQuery({
        query: (q) => q.from({ row: ledgerCollections.outsideMoves }),
        queryKey: ["ledger.outsideMoves"],
    }).data;
    const outsidePayments = useLiveQuery({
        query: (q) => q.from({ row: ledgerCollections.outsidePayments }),
        queryKey: ["ledger.outsidePayments"],
    }).data;
    const savingsGoals = useLiveQuery({
        query: (q) => q.from({ row: ledgerCollections.savingsGoals }),
        queryKey: ["ledger.savingsGoals"],
    }).data;
    const transactions = useLiveQuery({
        query: (q) => q.from({ row: ledgerCollections.transactions }),
        queryKey: ["ledger.transactions"],
    }).data;
    const transfers = useLiveQuery({
        query: (q) => q.from({ row: ledgerCollections.transfers }),
        queryKey: ["ledger.transfers"],
    }).data;
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
