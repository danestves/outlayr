import Constants from "expo-constants";
import { Directory, File, Paths } from "expo-file-system";
import { Platform } from "react-native";

import {
    adoptQueue,
    claimPendingWrites as claimQueue,
    parseLegacyQueue,
    QUEUE_DIRECTORY,
    QUEUE_FILE,
    releasePendingWrites as releaseQueue,
} from "./pending-writes-core";
import type { ClaimedWrites, QueueFiles } from "./pending-writes-core";
import { sharedStore } from "./shared-store";

/**
 * Read from `extra` rather than repeated, so the app and the intents cannot drift onto different containers.
 * Widgets do not use this group: `expo-widgets` owns its own transport.
 */
// SAFETY: as in `device-data-stores`: `extra` is an open record.
const APP_GROUP = Constants.expoConfig?.extra?.appGroup as string | undefined;

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

function queueDirectory(): Directory | null {
    if (Platform.OS === "android") {
        const directory = new Directory(Paths.document, QUEUE_DIRECTORY);
        directory.create({ idempotent: true, intermediates: true });
        return directory;
    }
    if (Platform.OS !== "ios" || !APP_GROUP) {
        return null;
    }
    const container = Paths.appleSharedContainers[APP_GROUP];
    if (!container) {
        return null;
    }
    const directory = new Directory(container, QUEUE_DIRECTORY);
    directory.create({ idempotent: true, intermediates: true });
    return directory;
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

/**
 * Nothing is deleted here: the caller commits, then calls {@link releasePendingWrites}, so a force-quit mid-drain
 * replays. That is safe because `applyPendingWrites` records each enqueue id in the same SQLite transaction.
 */
export function claimPendingWrites(): ClaimedWrites {
    try {
        adoptLegacyQueue();
        return claimQueue(queueFiles);
    } catch (error) {
        console.warn("[outlayr] pending writes unreadable", error);
        return { jobs: [], names: [] };
    }
}

export function releasePendingWrites(claimed: ClaimedWrites): void {
    try {
        releaseQueue(queueFiles, claimed);
    } catch (error) {
        console.warn("[outlayr] pending writes not released", error);
    }
}
