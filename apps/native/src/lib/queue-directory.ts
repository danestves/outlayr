import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import Constants from "expo-constants";
import { Directory, Paths } from "expo-file-system";
import { Platform } from "react-native";

export const QUEUE_DIRECTORY = "pending-writes";

// Mirror `queueLockFile` and `queueSequenceFile` in `app-intents/SharedStore.swift` and the Kotlin store.
export const QUEUE_LOCK_FILE = "queue.lock";
export const QUEUE_SEQUENCE_FILE = "sequence";

const decodeAppGroup = Schema.decodeUnknownOption(Schema.String);
/**
 * Read from `extra` rather than repeated, so the app and the intents cannot drift onto different containers.
 * Widgets do not use this group: `expo-widgets` owns its own transport.
 */
const APP_GROUP = Option.getOrUndefined(decodeAppGroup(Constants.expoConfig?.extra?.appGroup));

export function queueDirectory(): Directory | null {
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
