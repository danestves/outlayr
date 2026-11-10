import { eq, inArray } from "drizzle-orm";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

import { appMeta } from "@/db/schema";
import { afterRollback } from "@/db/transaction";

import { isMetaName, META, SYNCED_META_NAMES } from "./app-meta-registry";
import type { MetaEntry, MetaName, MetaStored, MetaValue } from "./app-meta-registry";
import type { SpendDb } from "./budget-spent";

const AppMetaOperation = Schema.Literals(["get", "heal", "remove", "set"]);

export class AppMetaError extends Schema.TaggedError<AppMetaError>()("AppMetaError", {
    cause: Schema.Defect(),
    key: Schema.String,
    operation: AppMetaOperation,
}) {
    override get message(): string {
        return `App meta ${this.operation} failed for ${this.key}`;
    }
}

export class CorruptMetaError extends Schema.TaggedError<CorruptMetaError>()("CorruptMetaError", {
    key: Schema.String,
}) {
    override get message(): string {
        return `App meta ${this.key} held a corrupt value`;
    }
}

interface Read<A> {
    readonly dropped: number;
    readonly value: A;
}

interface Codec<A, Stored> {
    readonly missing: () => A;
    readonly read: (raw: string) => Read<A> | null;
    readonly write: (value: Stored) => string;
}

const decodeJsonArray = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Array(Schema.Unknown)));

function codecOf(entry: MetaEntry): Codec<unknown, unknown> {
    if ("elements" in entry) {
        const decodeElement = Schema.decodeUnknownOption(entry.elements);
        const encode = Schema.encodeSync(Schema.Array(entry.elements));
        return {
            missing: () => [],
            read: (raw) =>
                Option.getOrNull(
                    Option.map(decodeJsonArray(raw), (parsed) => {
                        const kept = parsed.flatMap((element) => Option.toArray(decodeElement(element)));
                        return { dropped: parsed.length - kept.length, value: kept };
                    })
                ),
            // SAFETY: `MetaStored` of a list key is an array of the element type, which is all `Meta.set` passes.
            write: (value) => JSON.stringify(encode(value as readonly unknown[])),
        };
    }
    const decodeText = Schema.decodeUnknownOption(entry.schema);
    return {
        missing: () => entry.default,
        read: (raw) => Option.getOrNull(Option.map(decodeText(raw), (value) => ({ dropped: 0, value }))),
        write: Schema.encodeSync(entry.schema),
    };
}

const codecs = new Map<MetaName, Codec<unknown, unknown>>();

function codecFor<K extends MetaName>(name: K): Codec<MetaValue<K>, MetaStored<K>> {
    const codec = codecs.get(name) ?? codecOf(META[name]);
    codecs.set(name, codec);
    // SAFETY: built from `META[name]`, the entry `MetaValue<K>` and `MetaStored<K>` derive from.
    return codec as Codec<MetaValue<K>, MetaStored<K>>;
}

type Problem = "corrupt value" | "dropped corrupt elements";

const problemLine = (name: MetaName, problem: Problem): string => `[outlayr] app meta ${name}: ${problem}`;

const warned = new Set<string>();

function warnOnce(name: MetaName, problem: Problem): void {
    const line = problemLine(name, problem);
    if (!warned.has(line)) {
        warned.add(line);
        console.warn(line);
    }
}

function readRaw<K extends MetaName>(name: K, raw: string | null): Read<MetaValue<K>> | null {
    const codec = codecFor(name);
    return raw === null ? { dropped: 0, value: codec.missing() } : codec.read(raw);
}

const stored = (db: SpendDb, name: MetaName) =>
    db.select({ value: appMeta.value }).from(appMeta).where(eq(appMeta.key, name)).limit(1);

function heal(db: SpendDb, name: MetaName): void {
    const reset = () => {
        db.delete(appMeta).where(eq(appMeta.key, name)).run();
    };
    reset();
    afterRollback(db, reset);
}

const query = <A>(operation: typeof AppMetaOperation.Type, key: string, run: () => PromiseLike<A>) =>
    Effect.tryPromise({ catch: (cause) => new AppMetaError({ cause, key, operation }), try: run });

const set = <K extends MetaName>(db: SpendDb, name: K, value: MetaStored<K>): Effect.Effect<void, AppMetaError> =>
    query("set", name, () => {
        const text = codecFor(name).write(value);
        return db
            .insert(appMeta)
            .values({ key: name, value: text })
            .onConflictDoUpdate({ set: { value: text }, target: appMeta.key });
    }).pipe(Effect.asVoid, Effect.withSpan("AppMeta.set"));

const failCorrupt = Effect.fn("AppMeta.failCorrupt")(function* failCorrupt(db: SpendDb, name: MetaName) {
    yield* Effect.try({
        catch: (cause) => new AppMetaError({ cause, key: name, operation: "heal" }),
        try: () => heal(db, name),
    });
    yield* Effect.logWarning(problemLine(name, "corrupt value"));
    return yield* new CorruptMetaError({ key: name });
});

const get = <K extends MetaName>(db: SpendDb, name: K): Effect.Effect<MetaValue<K>, AppMetaError | CorruptMetaError> =>
    query("get", name, () => stored(db, name)).pipe(
        Effect.flatMap((rows) => {
            const found = readRaw(name, rows[0]?.value ?? null);
            if (found === null) {
                return failCorrupt(db, name);
            }
            if (found.dropped === 0) {
                return Effect.succeed(found.value);
            }
            // SAFETY: only a list key drops elements, and its value is the array its `MetaStored` describes.
            return set(db, name, found.value as MetaStored<K>).pipe(
                Effect.andThen(Effect.logWarning(problemLine(name, "dropped corrupt elements"))),
                Effect.as(found.value)
            );
        }),
        Effect.withSpan("AppMeta.get")
    );

function getSync<K extends MetaName>(db: SpendDb, name: K): MetaValue<K> {
    const found = readRaw(name, stored(db, name).all()[0]?.value ?? null);
    if (found === null) {
        heal(db, name);
        warnOnce(name, "corrupt value");
        throw new CorruptMetaError({ key: name });
    }
    if (found.dropped > 0) {
        warnOnce(name, "dropped corrupt elements");
    }
    return found.value;
}

function decode<K extends MetaName>(name: K, raw: string | null): MetaValue<K> {
    const found = readRaw(name, raw);
    if (found === null) {
        warnOnce(name, "corrupt value");
        return codecFor(name).missing();
    }
    if (found.dropped > 0) {
        warnOnce(name, "dropped corrupt elements");
    }
    return found.value;
}

function check(name: string, raw: string | null): boolean {
    return isMetaName(name) && readRaw(name, raw)?.dropped === 0;
}

const has = Effect.fn("AppMeta.has")(function* has(db: SpendDb, name: MetaName) {
    const rows = yield* query("get", name, () => stored(db, name));
    return rows.length > 0;
});

const hasSync = (db: SpendDb, name: MetaName): boolean => stored(db, name).all().length > 0;

const remove = Effect.fn("AppMeta.remove")(function* remove(db: SpendDb, names: readonly MetaName[]) {
    yield* query("remove", names.join(","), () => db.delete(appMeta).where(inArray(appMeta.key, [...names])));
});

export const Meta = {
    check,
    decode,
    get,
    getSync,
    has,
    hasSync,
    remove,
    set,
    syncedNames: SYNCED_META_NAMES,
};
