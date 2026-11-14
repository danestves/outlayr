import { createToaster } from "panelui-web/toast";
import { useMemo } from "react";
import { useIntlayer } from "react-intlayer";

import { useLedgerDb } from "@/components/dashboard/accounts/flows";
import { useDashboard } from "@/components/dashboard/shell/dashboard";
import { useLedgerCommitter } from "@/components/dashboard/shell/ledger-committer";
import type { ToastSurface } from "@/components/dashboard/shell/ledger-committer";
import type { Ledger } from "@/lib/dashboard-series-ledger";
import { ledgerCollections, tagBooks as tagBooksOf, useTagBooks } from "@/lib/ledger-db";
import type { TagBooks } from "@/lib/ledger-db";
import { useMeta, writeSettings } from "@/lib/ledger-settings";
import { appliedRun, categoryKinds, liveTags, ruleEntries } from "@/lib/rule-writes";
import { RULES_KEY, conflictsOf, ruleBookOf, statsOf, suggestionsOf } from "@/lib/rules";
import type { CategoryKinds, Change, Conflict, RuleBook, RuleEntry, RuleStat, Suggestion } from "@/lib/rules";

import { merchantOf } from "../transactions/entry-form";

export const ruleToasts = createToaster();

export const ruleNotices: ToastSurface = { holdMs: 6000, toasts: ruleToasts, tone: "success" };

export interface RulesData {
    book: RuleBook;
    conflicts: readonly Conflict[];
    entries: readonly RuleEntry[];
    kinds: CategoryKinds;
    stats: { byRule: ReadonlyMap<string, RuleStat>; matched: number };
    suggestions: readonly Suggestion[];
    tagBooks: TagBooks;
    tagNames: ReadonlyMap<string, string>;
}

export function rulesData(ledger: Ledger, book: RuleBook, tagBooks: TagBooks): RulesData {
    const entries = ruleEntries(ledger, tagBooks);
    const kinds = categoryKinds(ledger.books);
    return {
        book,
        conflicts: conflictsOf(book.rules, entries, kinds, book.settled),
        entries,
        kinds,
        stats: statsOf(book.rules, entries, kinds),
        suggestions: suggestionsOf(book, entries, kinds),
        tagBooks,
        tagNames: new Map(liveTags(tagBooks).map((tag) => [tag.localId, tag.name])),
    };
}

export function useRulesData(): RulesData {
    const { ledger } = useDashboard();
    const raw = useMeta().get(RULES_KEY);
    const tagBooks = useTagBooks();
    const book = useMemo(() => ruleBookOf(raw), [raw]);
    return useMemo(() => rulesData(ledger, book, tagBooks), [book, ledger, tagBooks]);
}

export type RuleWrites = ReturnType<typeof useRuleWrites>;

export function useRuleWrites() {
    const db = useLedgerDb();
    const committer = useLedgerCommitter(ruleNotices);
    const { toast } = useIntlayer("dashboard-rules");
    const { form } = useIntlayer("dashboard-transactions");
    const update = (change: (book: RuleBook) => RuleBook) => {
        const current = ruleBookOf(db.collection(ledgerCollections.appMeta).get(RULES_KEY)?.value);
        const next = change(current);
        writeSettings(db, { [RULES_KEY]: JSON.stringify(next) }).catch(() => {
            committer.notify({ failed: true, text: toast.saveFailed.value });
        });
        return next;
    };
    const undoable = (text: string, onUndo: () => void) => {
        committer.notify({ onUndo, text });
    };
    const apply = (changes: readonly Change[], categoryName: (id: string) => string, alsoUndo?: () => void) => {
        const current = committer.current();
        const { moved, rows, tagged } = appliedRun(
            current,
            tagBooksOf(db),
            changes,
            (values) => form.feeNote({ merchant: merchantOf(current, values) }).value
        );
        if (rows.length === 0) {
            return;
        }
        const targets = new Set(changes.flatMap((change) => (change.categoryId === null ? [] : [change.categoryId])));
        const [only] = targets;
        const count = moved > 0 ? moved : changes.filter((change) => change.tagIds.length > 0).length;
        const one = count === 1;
        const single = targets.size === 1 && only !== undefined && moved > 0 && tagged === 0;
        const category = single ? categoryName(only) : "";
        const plain = one ? toast.changedOne.value : toast.changed({ count: String(count) }).value;
        const named = one ? toast.movedOne({ category }).value : toast.moved({ category, count: String(count) }).value;
        committer.commitWithUndo(rows, {
            failed: toast.saveFailed.value,
            onUndone: alsoUndo,
            text: single ? named : plain,
        });
    };
    return { apply, undoable, update };
}
