import { useMemo } from "react";
import { useIntlayer } from "react-intlayer";

import { authorIdOf, memberNames } from "@/lib/profile-authors";
import type { ProfileMember, ProfileMembersView } from "@/lib/profile-sharing";

import type { FoldedRow } from "../home/rows";
import type { LedgerList } from "./use-ledger-list";

export interface EntryAuthors {
    authorOf: (row: FoldedRow) => string | null;
    labelOf: (id: string | null) => string | null;
    names: ReadonlyMap<string, string>;
    ownerId: string | null;
    people: readonly ProfileMember[];
    shared: boolean;
    viewerId: string | null;
}

export function useEntryAuthors(
    list: LedgerList,
    members: ProfileMembersView | null | undefined,
    viewerId: string | null
): EntryAuthors {
    const copy = useIntlayer("profile-sharing");
    const people = members?.members ?? [];
    const ownerId = people.find((member) => member.owner)?.id ?? null;
    const names = memberNames(people, copy.memberUnknown.value);
    const authorOf = useMemo(
        () => (row: FoldedRow) =>
            authorIdOf(
                "fromId" in row ? list.catalog.transfer(row.id) : list.catalog.transaction(row.id),
                ownerId,
                viewerId
            ),
        [list, ownerId, viewerId]
    );
    const labelOf = (id: string | null) => {
        if (id === null) {
            return null;
        }
        if (id === viewerId) {
            return copy.you.value;
        }
        return names.get(id) ?? null;
    };
    return { authorOf, labelOf, names, ownerId, people, shared: people.length > 1, viewerId };
}
