import { SYNCED_TABLES } from "@outlayr/backend/confect/lib/syncTables";
import type { SyncedTable } from "@outlayr/backend/confect/lib/syncTables";
import { api } from "@outlayr/backend/convex/_generated/api";

import { convexClient } from "@/lib/convex";

import type { PulledRow } from "./model";

export async function pullRows(tables: readonly SyncedTable[] = SYNCED_TABLES) {
    const rows: PulledRow[] = [];
    let cursor = 0;
    let more = true;
    while (more) {
        // oxlint-disable-next-line no-await-in-loop -- each page starts at the previous page's cursor.
        const page = await convexClient().query(api.sync.pullSince, { cursor, tables: [...tables] });
        rows.push(...page.rows);
        ({ cursor } = page);
        more = page.hasMore;
    }
    return rows;
}

export const download = (name: string, body: string, type: string) => {
    const url = URL.createObjectURL(new Blob([body], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
};
