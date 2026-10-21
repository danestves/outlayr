import { useMemo } from "react";

import type { Database } from "@/db/client";
import { tags, transactionTags } from "@/db/schema";
import { sortTags } from "@/domain/tags";

import { useLiveQuery } from "./live-query";
import { liveTagsQuery, tagIdsForQuery } from "./tags-core";
import type { TagRow } from "./tags-core";

export function useTags(db: Database): TagRow[] {
    const rows = useLiveQuery(tags, () => liveTagsQuery(db));
    return useMemo(() => sortTags(rows), [rows]);
}

/** Keyed on the id, so a form opened on another entry re-reads rather than showing the last one's tags. */
export function useTagIdsFor(db: Database, transactionId: string | null): string[] {
    const rows = useLiveQuery(transactionTags, () => tagIdsForQuery(db, transactionId ?? ""), [transactionId]);
    return useMemo(() => (transactionId ? rows.map((row) => row.tagId) : []), [rows, transactionId]);
}
