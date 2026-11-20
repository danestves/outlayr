import { decimalsFor } from "@outlayr/money/currency";
import { Field } from "panelui-web/field";
import { Input } from "panelui-web/input";
import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { useIntlayer } from "react-intlayer";

import { useLedgerCommitter } from "@/components/dashboard/shell/ledger-committer";
import { parseAmount } from "@/lib/account-writes";
import { editableDoc, entryEdit, toAmount } from "@/lib/bulk-writes";
import type { EditRefusal } from "@/lib/bulk-writes";
import type { Ledger, LedgerRow } from "@/lib/dashboard-series-ledger";
import { useTagBooks } from "@/lib/ledger-db";
import { retagged, TAG_NAME_LIMIT, tagNamesOf } from "@/lib/rule-writes";

import { merchantOf } from "./entry-form";
import { entryNotices } from "./use-delete";

export type InlineField = "amount" | "tags";

export interface Editing {
    field: InlineField;
    id: string;
}

const NOT_FIGURE = /[^\d.,]/gu;

// autoFocus only took on the first editor after a load, so the field focuses itself on mount.
const focusOnMount = (node: HTMLInputElement | null) => {
    node?.focus();
    node?.select();
};

/** The entry an amount edit rewrites, with its figure as typed text, or null when the drawer's rules lock it. */
export function amountDraft(ledger: Ledger, row: LedgerRow) {
    const doc = editableDoc(ledger.books, row.id);
    if (!doc) {
        return null;
    }
    const currency = doc.currency ?? ledger.currency;
    const text = new Intl.NumberFormat("en-US", {
        maximumFractionDigits: decimalsFor(currency),
        minimumFractionDigits: decimalsFor(currency),
    }).format(doc.amount);
    return { amount: doc.amount, currency, text: text.replaceAll(NOT_FIGURE, "") };
}

/** Each write answers with the message to show in the cell, or null once it has gone through. */
export function useInlineWrites() {
    const committer = useLedgerCommitter(entryNotices);
    const tagBooks = useTagBooks();
    const { form } = useIntlayer("dashboard-transactions");
    const { inline } = useIntlayer("dashboard-ledger");
    const refusalText = (refusal: EditRefusal) => {
        if (refusal === "amount") {
            return form.amountRequired.value;
        }
        return refusal === "rateMissing" ? form.rateMissing.value : form.saveFailed.value;
    };
    const amount = (row: LedgerRow, text: string): string | null => {
        const current = committer.current();
        const draft = amountDraft(current, row);
        if (draft !== null && parseAmount(text, decimalsFor(draft.currency)) === draft.amount) {
            return null;
        }
        const edit = entryEdit(
            current,
            row.id,
            toAmount(text),
            (values) => form.feeNote({ merchant: merchantOf(current, values) }).value
        );
        if ("refusal" in edit) {
            return refusalText(edit.refusal);
        }
        committer.commitWithUndo(edit.rows, { failed: form.saveFailed.value, text: inline.amountSaved.value });
        return null;
    };
    const tags = (row: LedgerRow, text: string): string | null => {
        const typed = tagNamesOf(text);
        if ("problem" in typed) {
            return inline.tagTooLong({ limit: String(TAG_NAME_LIMIT) }).value;
        }
        const rows = retagged(tagBooks, row.id, typed.names, Date.now());
        if (rows.length > 0) {
            committer.commitWithUndo(rows, { failed: form.saveFailed.value, text: inline.tagsSaved.value });
        }
        return null;
    };
    return { amount, tags };
}

export type InlineWrites = ReturnType<typeof useInlineWrites>;

interface EditorProps {
    addon: string | null;
    align: "end" | "start";
    initial: string;
    label: string;
    numeric: boolean;
    onCancel: () => void;
    onCommit: (text: string) => string | null;
    placeholder?: string;
}

function CellEditor({ addon, align, initial, label, numeric, onCancel, onCommit, placeholder }: EditorProps) {
    const [text, setText] = useState(initial);
    const [error, setError] = useState<string | null>(null);
    // Enter and Escape unmount the field, and a blur on the way out must not write a second time.
    const settled = useRef(false);
    const commit = () => {
        if (settled.current) {
            return;
        }
        if (text === initial) {
            settled.current = true;
            onCancel();
            return;
        }
        const refused = onCommit(text);
        settled.current = refused === null;
        setError(refused);
    };
    const input = (
        <Input
            aria-label={label}
            className={align === "end" ? "text-end font-mono tabular-nums" : undefined}
            inputMode={numeric ? "decimal" : "text"}
            onBlur={commit}
            onChange={(event) => {
                setText(event.target.value);
                setError(null);
            }}
            onKeyDown={(event) => {
                if (event.key === "Enter") {
                    event.preventDefault();
                    commit();
                } else if (event.key === "Escape") {
                    event.preventDefault();
                    event.stopPropagation();
                    settled.current = true;
                    onCancel();
                }
            }}
            placeholder={placeholder}
            ref={focusOnMount}
            size={addon === null ? "sm" : undefined}
            value={text}
        />
    );
    return (
        <Field
            className={`relative z-1 -my-1.5 gap-1 ${align === "end" ? "items-end" : "items-start"}`}
            invalid={error !== null}
        >
            {addon === null ? (
                input
            ) : (
                <Input.Group size="sm">
                    {input}
                    <Input.Addon align="end">
                        <span className="text-app-caption font-mono">{addon}</span>
                    </Input.Addon>
                </Input.Group>
            )}
            {error === null ? null : (
                <Field.Error className="font-sans whitespace-nowrap" match>
                    {error}
                </Field.Error>
            )}
        </Field>
    );
}

interface InlineCellProps extends Omit<EditorProps, "onCancel"> {
    children: ReactNode;
    editing: boolean;
    onEnd: () => void;
    onStart: () => void;
}

/** A cell that shows its value and turns into a field on click, the way the drawer's own fields write. */
export function InlineCell({ children, editing, onEnd, onStart, ...editor }: InlineCellProps) {
    if (editing) {
        return (
            <CellEditor
                {...editor}
                onCancel={onEnd}
                onCommit={(text) => {
                    const refused = editor.onCommit(text);
                    if (refused === null) {
                        onEnd();
                    }
                    return refused;
                }}
            />
        );
    }
    return (
        <button
            className={`rounded-app-sm hover:bg-app-hover focus-visible:ring-ring/30 relative z-1 -mx-1.5 box-content flex min-h-6 w-full min-w-0 items-center px-1.5 outline-none focus-visible:ring-3 ${editor.align === "end" ? "justify-end" : "justify-start"}`}
            onClick={onStart}
            type="button"
        >
            <span className="sr-only">{editor.label}</span>
            {children}
        </button>
    );
}
