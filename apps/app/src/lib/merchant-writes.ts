import { merchantKey } from "@outlayr/money/merchant-key";

import { nextRow } from "./account-writes";
import type { Doc } from "./entry-writes";
import type { CommitRow } from "./ledger-committer";

export interface MerchantChange {
    /** Every entry under the same merchant, or this one alone. */
    everywhere: boolean;
    /** A `merchants/<domain>` logo or an uploaded photo's key; undefined leaves each image as it is. */
    imageKey?: string;
    name: string;
}

const DOMAIN = /^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/u;
const WWW = /^www\./u;

/** The site a pasted link points at, as the logo Worker files it: lowercase, no `www.`, no path. */
export function websiteDomain(text: string): string | null {
    const trimmed = text.trim().toLowerCase();
    if (trimmed === "" || trimmed.includes(" ")) {
        return null;
    }
    try {
        const { hostname } = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
        const apex = hostname.replace(WWW, "");
        return DOMAIN.test(apex) ? apex : null;
    } catch {
        return null;
    }
}

const hasOwnLook = (doc: Doc) => doc.emoji !== null || doc.icon !== null || doc.customColor !== null;

/** The entry first, then every live entry under its merchant; transfer legs and card fees keep their own names. */
export function merchantEntries(transactions: readonly Doc[], id: string): Doc[] {
    const entry = transactions.find((doc) => doc.localId === id && doc.deletedAt === null);
    const key = entry ? merchantKey(entry.note) : "";
    if (!entry || key === "") {
        return entry ? [entry] : [];
    }
    const siblings = transactions.filter(
        (doc) =>
            doc !== entry &&
            doc.deletedAt === null &&
            doc.feeForId == null &&
            doc.transferId == null &&
            merchantKey(doc.note) === key
    );
    return [entry, ...siblings];
}

/**
 * The rows one merchant edit writes. The entry always takes the new image; another entry keeps an emoji, glyph or tint
 * its owner chose, the rule the phone follows when a logo spreads to the same merchant.
 */
export function merchantEdited(transactions: readonly Doc[], id: string, change: MerchantChange, at: number) {
    const name = change.name.trim();
    const [entry, ...siblings] = merchantEntries(transactions, id);
    const targets = entry ? [entry, ...(change.everywhere ? siblings : [])] : [];
    const rows: CommitRow[] = [];
    let renamed = 0;
    for (const doc of targets) {
        const patch: Record<string, string | null> = {};
        if (name !== "" && doc.note !== name) {
            patch.note = name;
            renamed += 1;
        }
        const own = hasOwnLook(doc);
        if (change.imageKey !== undefined && doc === entry && own) {
            Object.assign(patch, { customColor: null, emoji: null, icon: null });
        }
        if (change.imageKey !== undefined && (doc === entry || !own) && doc.imageKey !== change.imageKey) {
            Object.assign(patch, { imageColor: null, imageKey: change.imageKey });
        }
        if (Object.keys(patch).length > 0) {
            rows.push(nextRow("transactions", doc, patch, at));
        }
    }
    return { renamed, rows };
}
