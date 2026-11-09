import { useLoaderData, useRouteContext } from "@tanstack/react-router";

import { ledgerCommitter } from "@/lib/ledger-committer";

export function useLedgerCommitter() {
    const db = useRouteContext({ from: "/_account/app", select: (context) => context.dbClient });
    const userId = useLoaderData({ from: "/_account/app", select: (loaded) => loaded.userId });
    return ledgerCommitter(db, userId);
}
