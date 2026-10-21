import { accountLedgerState, discardAccountLedger, replaceLocalFromAccount } from "@/data/adoption-engine-core";
import type { AdoptionEngine } from "@/data/ledger-adoption";
import type { Database } from "@/db/client";
import { syncTransport } from "@/lib/convex";

/**
 * Null resolves every adoption to `defer`: no row is touched and no marker is written, so reconciliation waits for
 * a launch that can reach Convex rather than being silently skipped.
 */
export function adoptionEngine(db: Database | null): AdoptionEngine | null {
    const transport = syncTransport();
    if (db == null) {
        return null;
    }
    return {
        accountLedger: () => accountLedgerState(transport.pull),
        discardAccountLedger: () => discardAccountLedger(db, transport),
        replaceFromAccount: () => replaceLocalFromAccount(db, transport.pull),
    };
}
