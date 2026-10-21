import { File } from "expo-file-system";

import { replateStoredLogos } from "@/data/logo-replate-core";
import type { CachedOriginal } from "@/data/logo-replate-core";
import type { Database } from "@/db/client";

import { listCachedLogos, logoCacheKey } from "./logo-cache";
import { blackBakedSignature, decodeImage, platePlan } from "./logo-plating";
import { persistLogoBytes } from "./photo-storage";

async function readOriginal(file: File): Promise<CachedOriginal | null> {
    try {
        const bytes = await file.bytes();
        const image = decodeImage(bytes);
        if (image == null || platePlan(image).kind === "keep") {
            return null;
        }
        const signature = blackBakedSignature(image);
        return signature == null ? null : { bytes, signature };
    } catch {
        return null;
    }
}

export function replateLogos(db: Database): Promise<number> {
    const files = listCachedLogos();
    const originals = new Map<string, Promise<CachedOriginal | null>>();
    const read = (file: File) => {
        const hit = originals.get(file.name) ?? readOriginal(file);
        originals.set(file.name, hit);
        return hit;
    };

    return replateStoredLogos(db, {
        // A key is the folded name then the folded domain, so the shortest key under a name was fetched for that name.
        originalsFor: async (name) => {
            const prefix = logoCacheKey(name.trim(), null);
            if (prefix.length === 0) {
                return [];
            }
            const named = files
                .filter((file) => file.name.startsWith(prefix))
                .sort((a, b) => a.name.length - b.name.length);
            const loaded = await Promise.all(named.map(read));
            return loaded.filter((original): original is CachedOriginal => original != null);
        },
        persist: persistLogoBytes,
        signature: async (uri) => {
            try {
                const image = decodeImage(await new File(uri).bytes());
                return image == null ? null : blackBakedSignature(image);
            } catch {
                return null;
            }
        },
    });
}
