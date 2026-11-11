import { api } from "@outlayr/backend/convex/_generated/api";
import type { Doc } from "@outlayr/backend/convex/_generated/dataModel";
import { convexCollectionOptions } from "@tanstack/convex-db-collection";
import { collectionOptions, useLiveQuery } from "@tanstack/react-db";
import type {
    Collection,
    CollectionConfig,
    CollectionOptions,
    DbClient,
    NonSingleResult,
    SyncConfig,
    UtilsRecord,
} from "@tanstack/react-db";
import { ConvexError } from "convex/values";
import { useMemo } from "react";

import { CONVEX } from "./db";
import type { LedgerConvex } from "./db";
import type { LedgerBooks } from "./ledger-books";
import { dropLedger } from "./ledger-cache";
import { createLedgerSync, isSavedCursor } from "./ledger-sync";
import type { LedgerSync, PulledRow } from "./ledger-sync";
import { pushRows } from "./ledger-write";

const convexOf = (db: DbClient) => db.requireDependency<LedgerConvex>(CONVEX);

type TagTable = "tags" | "transactionTags";

type Stored = { [Table in Exclude<keyof LedgerBooks, "appMeta" | "exchangeRates">]: LedgerBooks[Table][number] } & {
    [Table in TagTable]: Doc<Table>;
};

type DocTable = keyof Stored;
type SyncedTable = DocTable | "appMeta";

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

const docOf = <Table extends DocTable>(row: PulledRow) =>
    // SAFETY: push checks a row's fields against the schema of the table it names,
    // so a pulled row is that table's document.
    ({
        ...row.fields,
        _creationTime: row.updatedAt,
        _id: row.localId,
        deletedAt: row.deletedAt,
        deviceId: row.deviceId,
        localId: row.localId,
        restoredAt: row.restoredAt,
        seq: row.seq,
        updatedAt: row.updatedAt,
        userId: "",
    }) as Stored[Table];

type Loadable = Pick<Collection, "preload" | "reload" | "status">;

const start = (collection: Loadable) => (collection.status === "error" ? collection.reload() : collection.preload());

const RETRY_WAITS_MS = [500, 1500, 4000, 8000];

// A busy server can time this query out at Convex's 1 s limit, and one failure must not sink the page.
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

const syncedTables: SyncedTable[] = [];
const openers: ((db: DbClient) => Loadable)[] = [];

const ledgerTable = <Row extends object, Key extends string | number, Utils extends UtilsRecord>(
    options: CollectionOptions<Row, Key, never, Utils> & NonSingleResult
) => {
    openers.push((db) => db.collection(options));
    return options;
};

const engines = new WeakMap<DbClient, LedgerSync<SyncedTable>>();

export function ledgerSync(db: DbClient) {
    const running = engines.get(db);
    if (running) {
        return running;
    }
    const convex = convexOf(db);
    const engine = createLedgerSync({
        onStale: () => {
            void dropLedger().then(() => window.location.reload());
        },
        source: {
            head: () => convex.watchQuery(api.sync.currentSeq, {}),
            pull: (cursor) => convex.watchQuery(api.sync.pullSince, { cursor, tables: syncedTables }),
        },
        tables: syncedTables,
    });
    engines.set(db, engine);
    return engine;
}

interface Storing<Row> {
    getKey: (row: Row) => string;
    keepsDeleted: boolean;
    rowOf: (pulled: PulledRow) => Row;
}

const syncedConfig = <Row extends object>(db: DbClient, table: SyncedTable, storing: Storing<Row>) => {
    const sync: SyncConfig<Row, string> = {
        exportSyncMeta: () => ledgerSync(db).saved(),
        importSyncMeta: (meta) => {
            if (isSavedCursor(meta)) {
                ledgerSync(db).restore(table, meta);
            }
        },
        rowUpdateMode: "full",
        sync: ({ begin, commit, fail, markReady, write }) =>
            ledgerSync(db).attach(table, {
                apply: (rows) => {
                    begin();
                    for (const row of rows) {
                        if (row.deletedAt === null || storing.keepsDeleted) {
                            write({ type: "update", value: storing.rowOf(row) });
                        } else {
                            write({ key: row.localId, type: "delete" });
                        }
                    }
                    return commit();
                },
                fail,
                ready: markReady,
            }),
    };
    // Only the sync fills these tables, and it never sends a row twice: one emptied for having no reader stays empty.
    return { gcTime: 0, getKey: storing.getKey, id: `ledger.${table}`, sync };
};

const docs = <Table extends DocTable>(table: Table, keepsDeleted = true) => {
    syncedTables.push(table);
    return collectionOptions(`ledger.${table}`, (db) =>
        syncedConfig(db, table, { getKey: (row: Stored[Table]) => row.localId, keepsDeleted, rowOf: docOf<Table> })
    );
};

const saveMeta = async (db: DbClient, mutations: readonly { modified: MetaRow }[]) => {
    const seq = await pushRows(
        db,
        mutations.map(({ modified }) => ({
            deletedAt: null,
            fields: { value: modified.value },
            localId: modified.key,
            table: "appMeta",
            updatedAt: modified.updatedAt,
        }))
    );
    await ledgerSync(db).reached(seq);
};

const settings = () => {
    syncedTables.push("appMeta");
    return collectionOptions("ledger.appMeta", (db): CollectionConfig<MetaRow, string> => ({
        ...syncedConfig(db, "appMeta", { getKey: (row: MetaRow) => row.key, keepsDeleted: true, rowOf: metaOf }),
        onInsert: ({ transaction }) => saveMeta(db, transaction.mutations),
        onUpdate: ({ transaction }) => saveMeta(db, transaction.mutations),
    }));
};

export const ledgerCollections = {
    accounts: ledgerTable(docs("accounts")),
    appMeta: ledgerTable(settings()),
    budgetPlans: ledgerTable(docs("budgetPlans")),
    budgets: ledgerTable(docs("budgets")),
    categories: ledgerTable(docs("categories")),
    exchangeRates: collectionOptions("ledger.exchangeRates", (db) =>
        convexCollectionOptions({
            client: convexOf(db),
            getKey: (row) => row._id,
            queryArgs: {},
            id: "ledger.exchangeRates",
            query: api.ledger.exchangeRates,
        })
    ),
    installmentPlans: ledgerTable(docs("installmentPlans")),
    installments: ledgerTable(docs("installments")),
    mainBudget: ledgerTable(docs("mainBudget")),
    outsideMoves: ledgerTable(docs("outsideMoves")),
    outsidePayments: ledgerTable(docs("outsidePayments")),
    savingsGoals: ledgerTable(docs("savingsGoals")),
    tags: ledgerTable(docs("tags")),
    transactionTags: ledgerTable(docs("transactionTags")),
    transactions: ledgerTable(docs("transactions", false)),
    transfers: ledgerTable(docs("transfers", false)),
} satisfies Record<keyof LedgerBooks | TagTable, { id: string }>;

export const preloadLedger = (db: DbClient) =>
    Promise.all([load(db.collection(ledgerCollections.exchangeRates)), ...openers.map((open) => start(open(db)))]);

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
    budgetPlans: rowsOf(db, ledgerCollections.budgetPlans),
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
    const budgetPlans = useRows(ledgerCollections.budgetPlans);
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
            budgetPlans,
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
            budgetPlans,
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

export type Tag = Stored["tags"];
export type TagLink = Stored["transactionTags"];

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
