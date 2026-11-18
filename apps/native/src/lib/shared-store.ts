import { requireOptionalNativeModule } from "expo";

interface SharedStoreModule {
    /** `unavailable` is a keychain still locked since boot: never mint over it. */
    captureKeyStatus: () => "absent" | "present" | "unavailable";
    get: (key: string) => string | null;
    remove: (key: string) => void;
    set: (key: string, value: string) => void;
    setCaptureKey: (key: string | null) => boolean;
}

export const sharedStore = requireOptionalNativeModule<SharedStoreModule>("SharedStore");
