import { File } from "expo-file-system";

import {
    activeProfileId,
    ledgerKey,
    readProfileSwitch,
    retargetProfileSwitch,
    writeProfileSwitch,
} from "./active-profile";
import type { ProfileSwitch } from "./active-profile";
import { readClaimAssignments, retargetClaimAssignments, writeClaimAssignments } from "./claim-assignments";
import { readPurchaseRoutes, retargetPurchaseRoutes, writePurchaseRoutes } from "./purchase-routes";
import { queueDirectory } from "./queue-directory";
import {
    adoptQueue,
    claimPendingWrites as claimQueue,
    foldHeld,
    hasHeldWrites,
    heldIds,
    holdQueue,
    parseLegacyQueue,
    QUEUE_FILE,
    releasePendingWrites as releaseQueue,
    WALLET_DEDUPE_WINDOW_MS,
} from "./queue-file";
import type { CaptureAssignment, ClaimedWrites, PendingWrite, PurchaseRoute, QueueFiles } from "./queue-file";
import { sharedStore } from "./shared-store";

/** Retired: one JSON string let two intents overwrite each other. `adoptLegacyQueue` migrates what remains. */
export const PENDING_WRITES_KEY = "pendingWrites";

export const INTENT_SNAPSHOT_KEY = "intentSnapshot";

export const PUSHED_PURCHASES_KEY = "pushedPurchases";

export const WALLET_PUSH_KEY = "walletPush";

/** Epoch ms string `SignalWalletRunIntent` writes on every Wallet automation run. */
const WALLET_LAST_RUN_KEY = "walletLastRunAt";

/** Mirrors `IntentSnapshot` in `app-intents/SharedStore.swift`: the field names are the wire format. */
export interface IntentSnapshot {
    budget: {
        present: boolean;
        name: string;
        periodLabel: string;
        remaining: string;
        remainingCaption: string;
        spent: string;
        limit: string;
        percent: string;
    };
    /** Overall first: the intent falls back to the first entry when no budget is named. */
    budgets: {
        id: string;
        name: string;
        remaining: string;
        remainingCaption: string;
        spent: string;
        limit: string;
        percent: string;
        periodLabel: string;
    }[];
    insights: {
        periodLabel: string;
        rangeLabel: string;
        net: string;
        netPositive: boolean;
        spent: string;
        income: string;
    };
}

export interface WalletPushSnapshot {
    cards: Record<string, { label: string | null; pick: boolean }>;
    missedTap: { body: string; title: string };
    newPlace: string;
    patterns: Record<string, { ignoreCase: boolean; source: string }>;
    places: { expense: Record<string, string>; income: Record<string, string> };
}

export function publishWalletPush(snapshot: WalletPushSnapshot): void {
    if (!sharedStore) {
        return;
    }
    try {
        sharedStore.set(WALLET_PUSH_KEY, JSON.stringify(snapshot));
    } catch (error) {
        console.warn("[outlayr] wallet push snapshot failed", error);
    }
}

export function readWalletLastRun(): number | null {
    const at = Number(sharedStore?.get(WALLET_LAST_RUN_KEY));
    return at > 0 ? at : null;
}

export function publishIntentSnapshot(snapshot: IntentSnapshot): void {
    if (!sharedStore) {
        return;
    }
    try {
        sharedStore.set(INTENT_SNAPSHOT_KEY, JSON.stringify(snapshot));
    } catch (error) {
        console.warn("[outlayr] intent snapshot failed", error);
    }
}

const queueFiles: QueueFiles = {
    claim(name) {
        const directory = queueDirectory();
        if (!directory) {
            return false;
        }
        const live = new File(directory, QUEUE_FILE);
        if (!live.exists || live.size === 0) {
            return false;
        }
        live.moveSync(new File(directory, name));
        return true;
    },

    discard(name) {
        const directory = queueDirectory();
        if (!directory) {
            return;
        }
        const file = new File(directory, name);
        if (file.exists) {
            file.delete();
        }
    },
    list() {
        const directory = queueDirectory();
        if (!directory) {
            return [];
        }
        return directory
            .list()
            .filter((entry): entry is File => entry instanceof File)
            .map((file) => file.name);
    },

    read(name) {
        const directory = queueDirectory();
        if (!directory) {
            return "";
        }
        const file = new File(directory, name);
        return file.exists ? file.textSync() : "";
    },

    write(name, text) {
        const directory = queueDirectory();
        if (!directory) {
            return;
        }
        const file = new File(directory, name);
        file.create({ overwrite: true });
        file.writeSync(text);
    },
};

function adoptLegacyQueue(): void {
    if (!sharedStore) {
        return;
    }
    const raw = sharedStore.get(PENDING_WRITES_KEY);
    if (!raw) {
        return;
    }
    adoptQueue(queueFiles, parseLegacyQueue(raw));
    sharedStore.remove(PENDING_WRITES_KEY);
}

/** Mirrors `answerPrefix` in `app-intents/CaptureLookup.swift`. */
const CAPTURE_ANSWER_PREFIX = "captureAnswer.";

const captureIds = ({ jobs }: ClaimedWrites) => jobs.flatMap((job) => (job.captureId ? [job.captureId] : []));

const answerOf = (captureId: string) => sharedStore?.get(`${CAPTURE_ANSWER_PREFIX}${captureId}`) ?? null;

// An inbox row carries the expense date, which can be days old, so its claim must never route it to a closed ledger.
export function adoptPendingWrites(jobs: PendingWrite[]): boolean {
    try {
        return holdQueue(queueFiles, ledgerKey(activeProfileId()), jobs);
    } catch (error) {
        console.warn("[outlayr] pending writes not adopted", error);
        return false;
    }
}

/** A profile deleted on another device never opens again: its held captures, cutoffs and routes follow Personal. */
export function retireLedger(key: string): void {
    try {
        retargetProfileSwitch(key, "personal");
        retargetPurchaseRoutes(key, "personal");
        retargetClaimAssignments(key, "personal");
        foldHeld(queueFiles, key, "personal");
    } catch (error) {
        console.warn("[outlayr] deleted profile queue not retired", error);
    }
}

/** Held captures, routed purchases or assignments a deleted ledger still owns, so retiring it again would do work. */
export function hasPendingQueueWork(key: string): boolean {
    try {
        return (
            hasHeldWrites(queueFiles, key) ||
            readPurchaseRoutes().some((entry) => entry.ledger === key) ||
            readClaimAssignments().some((entry) => entry.ledger === key)
        );
    } catch (error) {
        console.warn("[outlayr] pending queue work unreadable", error);
        return true;
    }
}

/** Ids parked in any ledger's held file, so their dismissal survives the file. Null means the scan failed. */
export function heldPendingWriteIds(): ReadonlySet<string> | null {
    try {
        return heldIds(queueFiles);
    } catch (error) {
        console.warn("[outlayr] held writes unreadable", error);
        return null;
    }
}

function persistCutoffs(cutoffs: readonly ProfileSwitch[]): void {
    const current = readProfileSwitch();
    const same =
        current.length === cutoffs.length &&
        current.every((entry, index) => entry.at === cutoffs[index]?.at && entry.from === cutoffs[index]?.from);
    if (!same) {
        writeProfileSwitch(cutoffs);
    }
}

function persistPurchases(purchases: readonly PurchaseRoute[]): void {
    const current = readPurchaseRoutes();
    const same =
        current.length === purchases.length &&
        current.every(
            (entry, index) =>
                entry.at === purchases[index]?.at &&
                entry.key === purchases[index]?.key &&
                entry.ledger === purchases[index]?.ledger
        );
    if (!same) {
        writePurchaseRoutes(purchases);
    }
}

function persistAssignments(assignments: readonly CaptureAssignment[]): void {
    const current = readClaimAssignments();
    const same =
        current.length === assignments.length &&
        current.every(
            (entry, index) => entry.id === assignments[index]?.id && entry.ledger === assignments[index]?.ledger
        );
    if (!same) {
        writeClaimAssignments(assignments);
    }
}

/**
 * Nothing is deleted here: the caller commits, then calls {@link releasePendingWrites}, so a force-quit mid-drain
 * replays. That is safe because `applyPendingWrites` records each enqueue id in the same SQLite transaction.
 * Routes and assignments persist before the drain applies anything, so a crash after its commit keeps them.
 */
export function claimPendingWritesOrThrow(): ClaimedWrites {
    adoptLegacyQueue();
    const now = Date.now();
    const claimed = claimQueue(queueFiles, {
        assignments: readClaimAssignments(),
        cutoffs: readProfileSwitch(),
        key: ledgerKey(activeProfileId()),
        now,
        purchases: readPurchaseRoutes(),
        siblingWindowMs: WALLET_DEDUPE_WINDOW_MS,
    });
    // Persisted anchors and assignments keep a replay routing each capture to the ledger the first pass chose.
    if (claimed.purchases !== undefined) {
        persistPurchases(claimed.purchases);
    }
    if (claimed.assignments !== undefined) {
        persistAssignments(claimed.assignments);
    }
    // A drain with nothing claimed returns before releasing, so it persists the pruned marker here instead.
    if (claimed.names.length === 0) {
        persistCutoffs(claimed.cutoffs ?? []);
    }
    return { ...claimed, captured: new Set(captureIds(claimed).filter((id) => answerOf(id) != null)) };
}

export function claimPendingWrites(): ClaimedWrites {
    try {
        return claimPendingWritesOrThrow();
    } catch (error) {
        console.warn("[outlayr] pending writes unreadable", error);
        return { jobs: [], names: [], seen: new Set() };
    }
}

export function releasePendingWritesOrThrow(claimed: ClaimedWrites): void {
    releaseQueue(queueFiles, claimed, ({ assignments, purchases }) => {
        persistPurchases(purchases);
        persistAssignments(assignments);
    });
    if (claimed.cutoffs !== undefined) {
        persistCutoffs(claimed.cutoffs);
    }
    for (const id of captureIds(claimed)) {
        sharedStore?.remove(`${CAPTURE_ANSWER_PREFIX}${id}`);
    }
}

export function releasePendingWrites(claimed: ClaimedWrites): void {
    try {
        releasePendingWritesOrThrow(claimed);
    } catch (error) {
        console.warn("[outlayr] pending writes not released", error);
    }
}
