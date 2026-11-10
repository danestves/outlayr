import { useMatch, useRouteContext } from "@tanstack/react-router";

import { ledgerCommitter } from "@/lib/ledger-committer";

export function useLedgerCommitter() {
    const db = useRouteContext({ from: "/_account/app", select: (context) => context.dbClient });
    // A pending screen draws the real screen before the loader has answered, so the loader data can be missing.
    const userId = useMatch({ from: "/_account/app", select: (match) => match.loaderData?.userId });
    return ledgerCommitter(db, userId);
}
