import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import type { TableDensity } from "panelui-web/table";
import { useSyncExternalStore } from "react";

export const COLUMNS = [
    "merchant",
    "category",
    "tags",
    "account",
    "loggedBy",
    "date",
    "amount",
    "notes",
    "paidVia",
] as const;
export type Column = (typeof COLUMNS)[number];

export const Layout = Schema.Struct({
    density: Schema.Literals(["comfortable", "compact"]),
    hidden: Schema.Array(Schema.Literals(COLUMNS)),
});
export type Layout = typeof Layout.Type;

export const DEFAULT_LAYOUT: Layout = { density: "comfortable", hidden: ["notes", "paidVia"] };

const KEY = "outlayr:transactions-layout";
const decode = Schema.decodeUnknownOption(Schema.fromJsonString(Layout));
const listeners = new Set<() => void>();
let cached: { raw: string | null; layout: Layout } | null = null;

function read(): Layout {
    let raw: string | null = null;
    try {
        raw = localStorage.getItem(KEY);
    } catch {
        return DEFAULT_LAYOUT;
    }
    if (cached?.raw !== raw) {
        cached = { layout: raw === null ? DEFAULT_LAYOUT : Option.getOrElse(decode(raw), () => DEFAULT_LAYOUT), raw };
    }
    return cached.layout;
}

function write(layout: Layout) {
    try {
        localStorage.setItem(KEY, JSON.stringify(layout));
    } catch {
        cached = { layout, raw: null };
    }
    for (const listener of listeners) {
        listener();
    }
}

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

export function useLayout() {
    const layout = useSyncExternalStore(subscribe, read, () => DEFAULT_LAYOUT);
    return {
        apply: (next: Layout) => write(next),
        density: layout.density satisfies TableDensity,
        layout,
        reset: () => write(DEFAULT_LAYOUT),
        setDensity: (density: Layout["density"]) => write({ ...layout, density }),
        shown: (column: Column) => !layout.hidden.includes(column),
        toggle: (column: Column) =>
            write({
                ...layout,
                hidden: layout.hidden.includes(column)
                    ? layout.hidden.filter((each) => each !== column)
                    : [...layout.hidden, column],
            }),
    };
}

export type LayoutControls = ReturnType<typeof useLayout>;
