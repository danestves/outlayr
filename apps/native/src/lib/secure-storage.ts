import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import { deleteItemAsync, getItemAsync, setItemAsync } from "expo-secure-store";

const SecureStorageOperation = Schema.Literals(["read", "write", "delete"]);

export class SecureStorageError extends Schema.TaggedError<SecureStorageError>()("SecureStorageError", {
    cause: Schema.Defect(),
    key: Schema.String,
    operation: SecureStorageOperation,
}) {
    override get message(): string {
        return `Secure storage ${this.operation} failed for key ${this.key}`;
    }
}

export const SecureStoreDriver = Context.Reference<{
    readonly deleteItem: (key: string) => Promise<void>;
    readonly getItem: (key: string) => Promise<string | null>;
    readonly setItem: (key: string, value: string) => Promise<void>;
}>("outlayr/lib/SecureStorage/SecureStoreDriver", {
    defaultValue: () => ({
        deleteItem: deleteItemAsync,
        getItem: getItemAsync,
        setItem: setItemAsync,
    }),
});

export class SecureStorage extends Context.Service<
    SecureStorage,
    {
        readonly get: (key: string) => Effect.Effect<string | null, SecureStorageError>;
        readonly remove: (key: string) => Effect.Effect<void, SecureStorageError>;
        readonly set: (key: string, value: string) => Effect.Effect<void, SecureStorageError>;
    }
>()("outlayr/lib/SecureStorage") {}

export const make = Effect.gen(function* make() {
    const driver = yield* SecureStoreDriver;
    return SecureStorage.of({
        get: Effect.fn("SecureStorage.get")((key: string) =>
            Effect.tryPromise({
                catch: (cause) => new SecureStorageError({ cause, key, operation: "read" }),
                try: () => driver.getItem(key),
            })
        ),
        remove: Effect.fn("SecureStorage.remove")((key: string) =>
            Effect.tryPromise({
                catch: (cause) => new SecureStorageError({ cause, key, operation: "delete" }),
                try: () => driver.deleteItem(key),
            })
        ),
        set: Effect.fn("SecureStorage.set")((key: string, value: string) =>
            Effect.tryPromise({
                catch: (cause) => new SecureStorageError({ cause, key, operation: "write" }),
                try: () => driver.setItem(key, value),
            })
        ),
    });
});

export const layer = Layer.effect(SecureStorage, make);
