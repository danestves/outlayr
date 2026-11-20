import type { ImagePart } from "@tanstack/ai";

const SPREAD_CHUNK = 0x80_00;

export function toBase64(bytes: Uint8Array): string {
    let binary = "";
    for (let start = 0; start < bytes.length; start += SPREAD_CHUNK) {
        binary += String.fromCodePoint(...bytes.subarray(start, start + SPREAD_CHUNK));
    }
    return btoa(binary);
}

export const imagePart = (bytes: ArrayBuffer, mimeType: string): ImagePart => ({
    source: { mimeType, type: "data", value: toBase64(new Uint8Array(bytes)) },
    type: "image",
});
