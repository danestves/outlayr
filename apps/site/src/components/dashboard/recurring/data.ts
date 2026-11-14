import { createToaster } from "panelui-web/toast";
import { useCallback, useMemo } from "react";
import { useIntlayer, useLocale } from "react-intlayer";

import { useLedgerDb } from "@/components/dashboard/accounts/flows";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { useLedgerCommitter } from "@/components/dashboard/shell/ledger-committer";
import type { ToastSurface } from "@/components/dashboard/shell/ledger-committer";
import { UNCATEGORIZED_ID } from "@/lib/dashboard-series-ledger";
import type { Ledger } from "@/lib/dashboard-series-ledger";
import type { CommitRow } from "@/lib/ledger-committer";
import { ledgerCollections } from "@/lib/ledger-db";
import { useMeta, writeSettings } from "@/lib/ledger-settings";
import { RECURRING_KEY, kpisOf, recurringBookOf, recurringModel, reverted } from "@/lib/recurring";
import type { RecurringBook, RecurringKpis, RecurringModel, Seed } from "@/lib/recurring";
import type { Outcome } from "@/lib/recurring-writes";

import { titled } from "../home/format";

export const recurringToasts = createToaster();

const recurringNotices: ToastSurface = { holdMs: 6000, toasts: recurringToasts, tone: "success" };

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
    run: (title: string, outcome: Outcome | readonly CommitRow[]) => void;
}

export function useRecurringWrites(): RecurringWrites {
    const db = useLedgerDb();
    const committer = useLedgerCommitter(recurringNotices);
    const { toast } = useIntlayer("dashboard-recurring");
    const readBook = () => recurringBookOf(db.collection(ledgerCollections.appMeta).get(RECURRING_KEY)?.value);
    const writeBook = (book: RecurringBook) => {
        writeSettings(db, { [RECURRING_KEY]: JSON.stringify(book) }).catch(() => {
            committer.notify({ failed: true, text: toast.failed.value });
        });
    };
    const run: RecurringWrites["run"] = (title, outcome) => {
        const { book, rows } = "rows" in outcome ? outcome : { book: undefined, rows: outcome };
        if (rows.length === 0 && !book) {
            return;
        }
        const before = book ? readBook() : null;
        const after = book && before ? book(before) : null;
        if (after) {
            writeBook(after);
        }
        const revert = () => {
            if (before && after) {
                writeBook(reverted(readBook(), before, after));
            }
        };
        if (rows.length === 0) {
            committer.notify({ onUndo: revert, text: title });
            return;
        }
        const held = committer.commitWithUndo(rows, { failed: toast.failed.value, onUndone: revert, text: title });
        void held.settled.then((result) => {
            if (result.status === "failed") {
                revert();
            }
        });
    };
    return { current: committer.current, run };
}
