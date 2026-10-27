import * as Effect from "effect/Effect";
import { File } from "expo-file-system";

import { replateStoredLogos } from "@/data/logo-replate-core";
import type { CachedOriginal } from "@/data/logo-replate-core";
import type { Database } from "@/db/client";

import { listCachedLogos, logoCacheKey } from "./logo-cache";
import { blackBakedSignature, decodeImage, platePlan } from "./logo-plating";
import { persistLogoBytes } from "./photo-storage";

const readOriginal = (file: File) =>
    Effect.tryPromise(() => file.bytes()).pipe(
        Effect.flatMap((bytes) =>
            Effect.try(() => {
                const image = decodeImage(bytes);
                if (image == null || platePlan(image).kind === "keep") {
                    return null;
                }
                const signature = blackBakedSignature(image);
                return signature == null ? null : ({ bytes, signature } satisfies CachedOriginal);
            })
        ),
        Effect.orElseSucceed(() => null)
    );

const signatureOf = (uri: string) =>
    Effect.tryPromise(() => new File(uri).bytes()).pipe(
        Effect.flatMap((bytes) =>
            Effect.try(() => {
                const image = decodeImage(bytes);
                return image == null ? null : blackBakedSignature(image);
            })
        ),
        Effect.orElseSucceed(() => null)
    );

export const replateLogos = Effect.fn("LogoReplate.replateLogos")(function* replateLogos(db: Database) {
    const files = listCachedLogos();
    const originals = new Map<string, Effect.Effect<CachedOriginal | null>>();
    const read = Effect.fn("LogoReplate.read")(function* read(file: File) {
        let hit = originals.get(file.name);
        if (hit === undefined) {
            hit = yield* Effect.cached(readOriginal(file));
            originals.set(file.name, hit);
        }
        return yield* hit;
    });

    return yield* replateStoredLogos(db, {
        // A key is the folded name then the folded domain, so the shortest key under a name was fetched for that
        // name.
        originalsFor: Effect.fn("LogoReplate.originalsFor")(function* originalsFor(name: string) {
            const prefix = logoCacheKey(name.trim(), null);
            if (prefix.length === 0) {
                return [];
            }
            const named = files
                .filter((file) => file.name.startsWith(prefix))
                .sort((a, b) => a.name.length - b.name.length);
            const loaded = yield* Effect.all(named.map(read), { concurrency: "unbounded" });
            return loaded.filter((original): original is CachedOriginal => original != null);
        }),
        persist: persistLogoBytes,
        signature: signatureOf,
    });
});
