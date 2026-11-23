import { Platform } from "react-native";

import { purchaseListener } from "./purchase-listener";
import { sharedStore } from "./shared-store";

interface QueueLock {
    claimQueue: (name: string) => boolean;
    eraseQueue: () => void;
    queueSequence: () => number;
}

function platformQueue(): QueueLock | null {
    if (Platform.OS === "ios") {
        return sharedStore;
    }
    if (Platform.OS === "android") {
        return purchaseListener;
    }
    return null;
}

/** The service that appends natively holds the lock a claim takes, so a capture never lands in a claimed file. */
export const queueLock: QueueLock | null = platformQueue();
