import { Platform } from "react-native";

import { purchaseListener } from "./purchase-listener";
import { sharedStore } from "./shared-store";

interface QueueLock {
    claimQueue: (name: string) => boolean;
    queueSequence: () => number | null;
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

/** The service that appends natively on this platform, which also holds the queue lock. */
export const queueLock: QueueLock | null = platformQueue();
