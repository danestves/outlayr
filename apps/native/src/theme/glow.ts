/** `[]` without the native module: the form then washes the mesh in the tint alone. */

import { requireNativeModule } from "expo";

interface GlowNativeModule {
    fromEmoji: (emoji: string) => string[];
    fromImage: (uri: string) => Promise<string[]>;
}

let native: GlowNativeModule | null = null;
try {
    native = requireNativeModule<GlowNativeModule>("Glow");
} catch {
    native = null;
}

const emojiCache = new Map<string, string[]>();

/** Synchronous and memoized per glyph. */
export function glowFromEmoji(emoji: string): string[] {
    const hit = emojiCache.get(emoji);
    if (hit) {
        return hit;
    }
    let result: string[] = [];
    if (native) {
        try {
            result = native.fromEmoji(emoji);
        } catch {
            result = [];
        }
    }
    emojiCache.set(emoji, result);
    return result;
}

/** Async: call it once when a photo is picked and store the result. */
export async function glowFromImage(uri: string): Promise<string[]> {
    if (!native) {
        return [];
    }
    try {
        return await native.fromImage(uri);
    } catch {
        return [];
    }
}
