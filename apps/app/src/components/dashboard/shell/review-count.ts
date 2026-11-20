import { useMatch } from "@tanstack/react-router";
import { useMemo } from "react";

import { ledgerCollections, useLanded, useRows } from "@/lib/ledger-db";

export function useReviewCount() {
    const transactions = useRows(ledgerCollections.transactions);
    const count = useMemo(
        () => transactions.filter((row) => row.unreviewed === true && row.deletedAt === null).length,
        [transactions]
    );
    const landed = useLanded();
    const seededWhole = useMatch({
        from: "/_account/_app",
        select: ({ loaderData }) => (loaderData === undefined ? undefined : loaderData.opening === null),
        shouldThrow: false,
    });
    return seededWhole === true || (seededWhole === false && landed) ? count : null;
}
