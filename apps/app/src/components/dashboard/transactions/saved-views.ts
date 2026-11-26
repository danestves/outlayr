import { useDbClient } from "@tanstack/react-db";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { useMemo } from "react";

import { useMeta, writeSettings } from "@/lib/ledger-settings";

import { Layout } from "./columns";
import type { SearchPatch } from "./search";

export const VIEW_PARAMS = [
    "accounts",
    "by",
    "category",
    "from",
    "max",
    "merchant",
    "min",
    "q",
    "span",
    "tags",
    "to",
    "type",
] as const satisfies readonly (keyof SearchPatch)[];

const SavedView = Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    params: Schema.Record(Schema.String, Schema.String),
    layout: Schema.optional(Layout),
    sort: Schema.NullOr(Schema.String),
});
export type SavedView = typeof SavedView.Type;

const KEY = "webSavedViews";
const NAME_LIMIT = 40;
const decode = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Array(SavedView)));

export const viewName = (raw: string) => raw.trim().replaceAll(/\s+/gu, " ").slice(0, NAME_LIMIT);

export const nameTaken = (views: readonly SavedView[], name: string, except: string | null = null) =>
    views.some((view) => view.id !== except && view.name.toLocaleLowerCase() === viewName(name).toLocaleLowerCase());

export function viewParams(search: Partial<Record<keyof SearchPatch, string | undefined>>) {
    return Object.fromEntries(
        VIEW_PARAMS.flatMap((key) => {
            const value = search[key];
            return value === undefined || value === "" ? [] : [[key, value]];
        })
    );
}

export function appliedPatch(view: SavedView): SearchPatch {
    const patch: SearchPatch = {
        ...Object.fromEntries(VIEW_PARAMS.map((key) => [key, view.params[key] ?? null])),
        view: view.id,
    };
    if (view.sort !== null) {
        patch.sort = view.sort;
    }
    return patch;
}

export function useSavedViews() {
    const db = useDbClient();
    const raw = useMeta().get(KEY) ?? null;
    const views = useMemo(() => (raw === null ? [] : Option.getOrElse(decode(raw), () => [])), [raw]);
    const store = (next: readonly SavedView[]) => writeSettings(db, { [KEY]: JSON.stringify(next) });
    const moved = (id: string, by: -1 | 1) => {
        const at = views.findIndex((view) => view.id === id);
        const to = at + by;
        if (at === -1 || to < 0 || to >= views.length) {
            return views;
        }
        const next = [...views];
        const [view] = next.splice(at, 1);
        return view ? next.toSpliced(to, 0, view) : views;
    };
    return {
        duplicate: (view: SavedView, name: string) =>
            store([...views, { ...view, id: crypto.randomUUID(), name: viewName(name) }]),
        move: (id: string, by: -1 | 1) => store(moved(id, by)),
        remove: (id: string) => store(views.filter((view) => view.id !== id)),
        rename: (id: string, name: string) =>
            store(views.map((view) => (view.id === id ? { ...view, name: viewName(name) } : view))),
        save: (view: Omit<SavedView, "id">) => {
            const id = crypto.randomUUID();
            return store([...views, { ...view, id, name: viewName(view.name) }]).then(() => id);
        },
        views,
    };
}
