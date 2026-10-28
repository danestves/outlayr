import { vi } from "vite-plus/test";

const nativeModules = new Map<string, object>();

const NATIVE_CONSTANTS: Record<string, Record<string, unknown>> = {
    ExpoUpdates: { isEmbeddedLaunch: true, isEnabled: false, localAssets: {}, manifest: {}, manifestString: null },
};

const inertModule = (name: string): object => {
    const members = new Map<PropertyKey, unknown>(Object.entries(NATIVE_CONSTANTS[name] ?? {}));
    return new Proxy(
        {},
        {
            get: (_, key) => {
                if (key === "then" || key === Symbol.toPrimitive) {
                    return undefined;
                }
                if (key === "name") {
                    return name;
                }
                if (!members.has(key)) {
                    members.set(key, vi.fn());
                }
                return members.get(key);
            },
            has: () => true,
            set: (_, key, value) => members.set(key, value).has(key),
        }
    );
};

export const requireNativeModule = (name: string): object => {
    if (!nativeModules.has(name)) {
        nativeModules.set(name, inertModule(name));
    }
    return nativeModules.get(name) ?? {};
};
export const requireOptionalNativeModule = requireNativeModule;
export const requireNativeViewManager = () => () => null;
export const registerWebModule = <T>(module: T): T => module;

class Emitter {
    readonly #listeners = new Map<string, Set<(...args: unknown[]) => void>>();

    addListener(event: string, listener: (...args: unknown[]) => void) {
        const set = this.#listeners.get(event) ?? new Set();
        set.add(listener);
        this.#listeners.set(event, set);
        return { remove: () => set.delete(listener) };
    }

    removeAllListeners(event: string) {
        this.#listeners.delete(event);
    }

    emit(event: string, ...args: unknown[]) {
        for (const listener of this.#listeners.get(event) ?? []) {
            listener(...args);
        }
    }

    listenerCount(event: string) {
        return this.#listeners.get(event)?.size ?? 0;
    }
}
export class NativeModule extends Emitter {}
export class SharedObject extends Emitter {
    release() {
        return undefined;
    }
}
export class SharedRef extends SharedObject {}

export class CodedError extends Error {
    readonly code: string;

    constructor(code: string, message: string) {
        super(message);
        this.name = "CodedError";
        this.code = code;
    }
}
export class UnavailabilityError extends CodedError {
    constructor(moduleName: string, propertyName: string) {
        super("ERR_UNAVAILABLE", `${moduleName}.${propertyName} is not available in tests`);
        this.name = "UnavailabilityError";
    }
}

export enum PermissionStatus {
    DENIED = "denied",
    GRANTED = "granted",
    UNDETERMINED = "undetermined",
}
export const createPermissionHook = () => () => [null, vi.fn(), vi.fn()];

export const uuid = { v4: () => crypto.randomUUID() };
export const NativeModulesProxy = {};
export { Emitter as EventEmitter };
export { Platform } from "./react-native";
export const requireNativeView = requireNativeViewManager;
export const reloadAppAsync = vi.fn(async () => undefined);
export const isRunningInExpoGo = () => false;
export const createSnapshotFriendlyRef = () => ({ current: null });
export const getBundleOrigin = () => "http://localhost:8081";

export class Asset {
    static fromModule = (module: unknown) => Object.assign(new Asset(), { uri: String(module) });
    static loadAsync = vi.fn(async () => []);
    localUri: string | null = null;
    uri = "";
    downloadAsync = vi.fn(async () => this);
}
export const useAssets = () => [[], undefined];
