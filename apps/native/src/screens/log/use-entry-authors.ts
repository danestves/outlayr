import { useAtomRefresh } from "@effect/atom-react/Hooks";

import { entryAuthor } from "@/domain/entry-author";
import { useProfileMembers } from "@/hooks/use-profile-sharing";
import { activeProfileId } from "@/lib/active-profile";
import { useAuthSession } from "@/lib/auth-session";
import { useCloudAuthenticated } from "@/lib/convex";
import { activeLedgerIsJoined } from "@/lib/joined-profiles";
import { useWhen } from "@/lib/lifecycle";
import { profileMembersAtom } from "@/lib/profile-sharing";

interface AuthoredRow {
    createdBy?: string | null;
}

/**
 * Resolves the byline for the rows on screen. Only a joined ledger, or an owned one
 * with someone else's row in it, reads the member list; Personal and unshared
 * ledgers never ask.
 */
export function useEntryAuthors(rows: readonly AuthoredRow[]) {
    const { accountId } = useAuthSession();
    const activeId = activeProfileId();
    const joined = activeLedgerIsJoined();
    const foreign = rows.some((row) => row.createdBy != null && row.createdBy !== accountId);
    const authenticated = useCloudAuthenticated();
    const members = useProfileMembers(joined || foreign ? (activeId ?? null) : null);
    const names = new Map<string, string | null>();
    for (const member of members?.members ?? []) {
        names.set(member.id, member.name);
    }
    const ownerId = members?.members.find((member) => member.owner)?.id ?? null;
    const refresh = useAtomRefresh(profileMembersAtom({ authenticated, profileId: activeId ?? "" }));
    // Someone who joined after the list was read has rows but no name yet.
    const stranger = rows.some(
        (row) => row.createdBy != null && row.createdBy !== accountId && !names.has(row.createdBy)
    );
    useWhen(members != null && stranger, () => {
        refresh();
        return undefined;
    });
    const shared = joined || members != null;
    const authorOf = (createdBy: string | null | undefined) =>
        shared ? entryAuthor(createdBy ?? null, ownerId, accountId, names) : null;
    // Rides on the section view, whose equality gate would otherwise keep stale bylines.
    const authorKey =
        members == null ? "" : members.members.map((member) => `${member.id}:${member.name ?? ""}`).join(",");
    return { authorOf, authorKey };
}
