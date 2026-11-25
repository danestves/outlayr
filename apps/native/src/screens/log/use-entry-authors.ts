import { entryAuthor } from "@/domain/entry-author";
import { useProfileMembers } from "@/hooks/use-profile-sharing";
import { activeProfileId } from "@/lib/active-profile";
import { useAuthSession } from "@/lib/auth-session";
import { activeLedgerIsJoined } from "@/lib/joined-profiles";

interface AuthoredRow {
    createdBy?: string | null;
    unsent?: boolean;
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
    const members = useProfileMembers(joined || foreign ? (activeId ?? null) : null);
    const names = new Map<string, string | null>();
    for (const member of members?.members ?? []) {
        names.set(member.id, member.name);
    }
    const ownerId = members?.members.find((member) => member.owner)?.id ?? null;
    const shared = joined || members != null;
    const authorOf = (createdBy: string | null | undefined, unsent: boolean) =>
        shared ? entryAuthor(createdBy ?? null, unsent, ownerId, accountId, names) : null;
    // Rides on the section view, whose equality gate would otherwise keep stale bylines.
    const authorKey =
        members == null ? "" : members.members.map((member) => `${member.id}:${member.name ?? ""}`).join(",");
    return { authorOf, authorKey };
}
