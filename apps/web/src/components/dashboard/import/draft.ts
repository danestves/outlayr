import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { useCallback, useSyncExternalStore } from "react";

import { FIELDS } from "@/lib/import-file";

export const DraftSource = Schema.Literals(["csv", "pdf", "notion"]);
export type DraftSource = typeof DraftSource.Type;

export const CategoryChoice = Schema.Union([
    Schema.Struct({ id: Schema.String, kind: Schema.Literal("existing") }),
    Schema.Struct({ kind: Schema.Literal("new"), name: Schema.String }),
    Schema.Struct({ kind: Schema.Literal("none") }),
]);
export type CategoryChoice = typeof CategoryChoice.Type;

export const AccountChoice = Schema.Union([
    Schema.Struct({ id: Schema.String, kind: Schema.Literal("existing") }),
    Schema.Struct({ kind: Schema.Literal("new"), type: Schema.Literals(["account", "card"]) }),
    Schema.Struct({ kind: Schema.Literal("skip") }),
]);
export type AccountChoice = typeof AccountChoice.Type;

const Suggestion = Schema.Struct({
    categoryName: Schema.String,
    domain: Schema.NullOr(Schema.String),
    label: Schema.String,
});

export const DraftStep = Schema.Literals(["match", "resolve", "review"]);
export type DraftStep = typeof DraftStep.Type;

const Draft = Schema.Struct({
    accounts: Schema.Record(Schema.String, AccountChoice),
    categories: Schema.Record(Schema.String, CategoryChoice),
    dateFormat: Schema.NullOr(Schema.String),
    /** Duplicates the user chose to bring in after all. */
    forced: Schema.Array(Schema.Number),
    header: Schema.Array(Schema.String),
    id: Schema.String,
    intoAccountId: Schema.NullOr(Schema.String),
    leftForLater: Schema.Boolean,
    name: Schema.String,
    readMs: Schema.NullOr(Schema.Number),
    rowCategories: Schema.Record(Schema.String, CategoryChoice),
    rows: Schema.Array(Schema.Array(Schema.String)),
    size: Schema.Number,
    source: DraftSource,
    step: DraftStep,
    suggestions: Schema.NullOr(Schema.Array(Suggestion)),
    targets: Schema.Array(Schema.Literals([...FIELDS, "skip"])),
    /** New rows the user unticked. */
    unticked: Schema.Array(Schema.Number),
});
export type Draft = typeof Draft.Type;

const KEY = "outlayr.importDraft.v1";
const decodeDraft = Schema.decodeUnknownOption(Schema.fromJsonString(Draft));

interface Held {
    draft: Draft | null;
    /** Read back from storage rather than started in this tab: the review shows it picked up where it left off. */
    restored: boolean;
}

const EMPTY: Held = { draft: null, restored: false };

function storeFor(userId: string) {
    const key = `${KEY}:${userId}`;
    const listeners = new Set<() => void>();
    let held: Held | null = null;
    const snapshot = (): Held => {
        if (held === null) {
            let raw: string | null = null;
            try {
                raw = globalThis.localStorage?.getItem(key) ?? null;
            } catch {
                raw = null;
            }
            const draft = raw === null ? null : Option.getOrNull(decodeDraft(raw));
            held = { draft, restored: draft !== null };
        }
        return held;
    };
    const set = (next: Held) => {
        held = next;
        try {
            if (next.draft === null) {
                globalThis.localStorage?.removeItem(key);
            } else {
                globalThis.localStorage?.setItem(key, JSON.stringify(next.draft));
            }
        } catch {
            // A file too big for storage still imports; it just can't be resumed after a reload.
        }
        for (const listener of listeners) {
            listener();
        }
    };
    return {
        change: (change: Partial<Draft>) => {
            const { draft, restored } = snapshot();
            if (draft) {
                set({ draft: { ...draft, ...change }, restored });
            }
        },
        clear: () => set(EMPTY),
        snapshot,
        start: (draft: Draft) => set({ draft, restored: false }),
        subscribe: (listener: () => void) => {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
        /** The resume notice is shown once; moving on from it settles the draft as this tab's. */
        settle: () => {
            const current = snapshot();
            if (current.restored) {
                held = { ...current, restored: false };
                for (const listener of listeners) {
                    listener();
                }
            }
        },
    };
}

export type DraftStore = ReturnType<typeof storeFor>;

const stores = new Map<string, DraftStore>();

export function draftStore(userId: string): DraftStore {
    const store = stores.get(userId) ?? storeFor(userId);
    stores.set(userId, store);
    return store;
}

const serverSnapshot = () => EMPTY;

export function useDraft(store: DraftStore | null) {
    const subscribe = useCallback((listener: () => void) => store?.subscribe(listener) ?? (() => undefined), [store]);
    return useSyncExternalStore(subscribe, store?.snapshot ?? serverSnapshot, serverSnapshot);
}

export function newDraft(
    fields: Pick<Draft, "dateFormat" | "header" | "name" | "rows" | "size" | "source" | "step" | "targets"> &
        Partial<Pick<Draft, "intoAccountId" | "readMs" | "suggestions">>
): Draft {
    return {
        accounts: {},
        categories: {},
        forced: [],
        id: crypto.randomUUID(),
        intoAccountId: null,
        leftForLater: false,
        readMs: null,
        rowCategories: {},
        suggestions: null,
        unticked: [],
        ...fields,
    };
}
