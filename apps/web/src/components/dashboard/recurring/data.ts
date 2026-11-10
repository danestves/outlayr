import { createToaster } from "panelui-web/toast";
import { useCallback, useMemo } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { useLedgerDb } from "@/components/dashboard/accounts/flows";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { useLedgerCommitter } from "@/components/dashboard/shell/ledger-committer";
import { UNCATEGORIZED_ID } from "@/lib/dashboard-series-ledger";
import type { Ledger } from "@/lib/dashboard-series-ledger";
import type { CommitRow } from "@/lib/ledger-committer";
import { ledgerBooks, ledgerCollections } from "@/lib/ledger-db";
import { useMeta, writeSettings } from "@/lib/ledger-settings";
import { RECURRING_KEY, kpisOf, recurringBookOf, recurringModel } from "@/lib/recurring";
import type { RecurringBook, RecurringKpis, RecurringModel, Seed } from "@/lib/recurring";
import type { Outcome } from "@/lib/recurring-writes";

import { titled } from "../home/format";

export const recurringToasts = createToaster();

const UNDO_MS = 6000;

export interface RecurringData {
    book: RecurringBook;
    kpis: RecurringKpis;
    model: RecurringModel;
}

export function useSeedName() {
    const { categories } = useDashboard().ledger;
    const { uncategorized } = useIntlayer("dashboard-home");
    const { locale } = useLocale();
    const fallback = uncategorized.value;
    return useCallback(
        (seed: Pick<Seed, "categoryId" | "note">) => {
            const note = seed.note.trim();
            if (note !== "") {
                return note;
            }
            const category = seed.categoryId === null ? undefined : categories.get(seed.categoryId);
            if (!category) {
                return "";
            }
            return category.id === UNCATEGORIZED_ID ? fallback : titled(category.name, locale);
        },
        [categories, fallback, locale]
    );
}

export function recurringData(ledger: Ledger, book: RecurringBook, nameOf: (seed: Seed) => string): RecurringData {
    const model = recurringModel(ledger, book, nameOf);
    return { book, kpis: kpisOf(model, ledger), model };
}

export function useRecurringData(): RecurringData {
    const { ledger } = useDashboard();
    const raw = useMeta().get(RECURRING_KEY);
    const book = useMemo(() => recurringBookOf(raw), [raw]);
    const nameOf = useSeedName();
    return useMemo(() => recurringData(ledger, book, nameOf), [book, ledger, nameOf]);
}

export interface RecurringWrites {
    /** The ledger as the local copy holds it right now, for writes built after an await or a dialog. */
    current: () => Ledger;
    run: (title: string, outcome: Outcome | readonly CommitRow[], undoable?: boolean) => void;
}

export function useRecurringWrites(): RecurringWrites {
    const { ledger } = useDashboard();
    const db = useLedgerDb();
    const committer = useLedgerCommitter();
    const { toast } = useIntlayer("dashboard-recurring");
    const failed = () => {
        recurringToasts.add({ title: toast.failed.value, type: "destructive" });
    };
    const readBook = () => recurringBookOf(db.collection(ledgerCollections.appMeta).get(RECURRING_KEY)?.value);
    const writeBook = (book: RecurringBook) => {
        writeSettings(db, { [RECURRING_KEY]: JSON.stringify(book) }).catch(failed);
    };
    const run: RecurringWrites["run"] = (title, outcome, undoable = true) => {
        const { book, rows } = "rows" in outcome ? outcome : { book: undefined, rows: outcome };
        if (rows.length === 0 && !book) {
            return;
        }
        const before = book ? readBook() : null;
        if (book && before) {
            writeBook(book(before));
        }
        const held = rows.length > 0 ? committer.commit(rows, { holdMs: UNDO_MS }) : null;
        void held?.settled.then((result) => {
            if (result.status === "failed") {
                failed();
            }
        });
        const id = recurringToasts.add({
            actionProps: undoable
                ? {
                      children: toast.undo.value,
                      onClick: () => {
                          recurringToasts.close(id);
                          const undone = held === null || held.undo();
                          if (undone && before) {
                              writeBook(before);
                          }
                      },
                  }
                : undefined,
            timeout: UNDO_MS,
            title,
            type: "success",
        });
    };
    return { current: () => ({ ...ledger, books: ledgerBooks(db) }), run };
}
