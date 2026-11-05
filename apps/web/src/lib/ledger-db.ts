import type { LedgerBooks } from "@outlayr/backend/confect/ledgerView";
import { api } from "@outlayr/backend/convex/_generated/api";
import { convexCollectionOptions, convexPaginatedCollectionOptions } from "@tanstack/convex-db-collection";
import type { ConvexCollectionClient } from "@tanstack/convex-db-collection";
import { collectionOptions, useLiveQuery } from "@tanstack/react-db";
import type { DbClient } from "@tanstack/react-db";
import { useMemo } from "react";

import { CONVEX } from "./db";

const PAGE_SIZE = 1000;
const MAX_ROWS = 100_000;

const convexOf = (db: DbClient) => db.requireDependency<ConvexCollectionClient>(CONVEX);

const paged = { maxRows: MAX_ROWS, pageSize: PAGE_SIZE };

export const ledgerCollections = {
    accounts: collectionOptions("ledger.accounts", (db) =>
        convexCollectionOptions({
            client: convexOf(db),
            getKey: (row) => row._id,
            queryArgs: {},
            id: "ledger.accounts",
            query: api.ledger.accounts,
        })
    ),
    appMeta: collectionOptions("ledger.appMeta", (db) =>
        convexCollectionOptions({
            client: convexOf(db),
            getKey: (row) => row._id,
            queryArgs: {},
            id: "ledger.appMeta",
            query: api.ledger.appMeta,
        })
    ),
    budgets: collectionOptions("ledger.budgets", (db) =>
        convexCollectionOptions({
            client: convexOf(db),
            getKey: (row) => row._id,
            queryArgs: {},
            id: "ledger.budgets",
            query: api.ledger.budgets,
        })
    ),
    categories: collectionOptions("ledger.categories", (db) =>
        convexCollectionOptions({
            client: convexOf(db),
            getKey: (row) => row._id,
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
            getKey: (row) => row._id,
            queryArgs: {},
            id: "ledger.installmentPlans",
            query: api.ledger.installmentPlans,
        })
    ),
    mainBudget: collectionOptions("ledger.mainBudget", (db) =>
        convexCollectionOptions({
            client: convexOf(db),
            getKey: (row) => row._id,
            queryArgs: {},
            id: "ledger.mainBudget",
            query: api.ledger.mainBudget,
        })
    ),
    outsideMoves: collectionOptions("ledger.outsideMoves", (db) =>
        convexCollectionOptions({
            client: convexOf(db),
            getKey: (row) => row._id,
            queryArgs: {},
            id: "ledger.outsideMoves",
            query: api.ledger.outsideMoves,
        })
    ),
    outsidePayments: collectionOptions("ledger.outsidePayments", (db) =>
        convexCollectionOptions({
            client: convexOf(db),
            getKey: (row) => row._id,
            queryArgs: {},
            id: "ledger.outsidePayments",
            query: api.ledger.outsidePayments,
        })
    ),
    transactions: collectionOptions("ledger.transactions", (db) =>
        convexPaginatedCollectionOptions({
            ...paged,
            client: convexOf(db),
            getKey: (row) => row._id,
            queryArgs: {},
            id: "ledger.transactions",
            query: api.ledger.transactions,
        })
    ),
    transfers: collectionOptions("ledger.transfers", (db) =>
        convexPaginatedCollectionOptions({
            ...paged,
            client: convexOf(db),
            getKey: (row) => row._id,
            queryArgs: {},
            id: "ledger.transfers",
            query: api.ledger.transfers,
        })
    ),
};

export const preloadLedger = (db: DbClient) =>
    Promise.all([
        db.collection(ledgerCollections.accounts).preload(),
        db.collection(ledgerCollections.appMeta).preload(),
        db.collection(ledgerCollections.budgets).preload(),
        db.collection(ledgerCollections.categories).preload(),
        db.collection(ledgerCollections.exchangeRates).preload(),
        db.collection(ledgerCollections.installmentPlans).preload(),
        db.collection(ledgerCollections.mainBudget).preload(),
        db.collection(ledgerCollections.outsideMoves).preload(),
        db.collection(ledgerCollections.outsidePayments).preload(),
        db.collection(ledgerCollections.transactions).preload(),
        db.collection(ledgerCollections.transfers).preload(),
    ]);

export const ledgerBooks = (db: DbClient): LedgerBooks => ({
    accounts: db.collection(ledgerCollections.accounts).toArray,
    appMeta: db.collection(ledgerCollections.appMeta).toArray,
    budgets: db.collection(ledgerCollections.budgets).toArray,
    categories: db.collection(ledgerCollections.categories).toArray,
    exchangeRates: db.collection(ledgerCollections.exchangeRates).toArray,
    installmentPlans: db.collection(ledgerCollections.installmentPlans).toArray,
    mainBudget: db.collection(ledgerCollections.mainBudget).toArray,
    outsideMoves: db.collection(ledgerCollections.outsideMoves).toArray,
    outsidePayments: db.collection(ledgerCollections.outsidePayments).toArray,
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
            mainBudget,
            outsideMoves,
            outsidePayments,
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
            mainBudget,
            outsideMoves,
            outsidePayments,
            transactions,
            transfers,
        ]
    );
}
