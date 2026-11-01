import { and, gt, isNull, min } from "drizzle-orm";
import * as Atom from "effect/reactivity/Atom";

import type { Database } from "@/db/client";
import { outsideMoves, outsidePayments, transactions, transfers } from "@/db/schema";

import { bindNextRowSource } from "./use-now";

export function nextBoundedDateAfter(db: Database, afterMs: number): number | null {
    const after = new Date(afterMs);
    const dates = [
        db
            .select({ at: min(transactions.date) })
            .from(transactions)
            .where(and(isNull(transactions.deletedAt), gt(transactions.date, after)))
            .get(),
        db
            .select({ at: min(transfers.date) })
            .from(transfers)
            .where(and(isNull(transfers.deletedAt), gt(transfers.date, after)))
            .get(),
        db
            .select({ at: min(outsidePayments.date) })
            .from(outsidePayments)
            .where(and(isNull(outsidePayments.deletedAt), gt(outsidePayments.date, after)))
            .get(),
        db
            .select({ at: min(outsideMoves.date) })
            .from(outsideMoves)
            .where(and(isNull(outsideMoves.deletedAt), gt(outsideMoves.date, after)))
            .get(),
    ].flatMap((row) => (row?.at ? [row.at.getTime()] : []));

    return dates.length > 0 ? Math.min(...dates) : null;
}

export const clockWakeAtom = Atom.family((db: Database) =>
    Atom.make((get) => {
        get.addFinalizer(bindNextRowSource((afterMs) => nextBoundedDateAfter(db, afterMs)));
        return null;
    }).pipe(Atom.withLabel("clock-wake:next-row"))
);
