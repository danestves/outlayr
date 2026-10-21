import { sha1 } from "@noble/hashes/legacy.js";

function uuidToBytes(uuid: string): Uint8Array {
    const hex = uuid.replaceAll("-", "");
    if (hex.length !== 32) {
        throw new Error(`Not a UUID: ${uuid}`);
    }
    const bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i += 1) {
        bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
}

function format(bytes: Uint8Array): string {
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20, 32)].join("-");
}

// The same id on every device, for a row two devices may both decide to create.
export function uuidV5(name: string, namespace: string): string {
    const nameBytes = new TextEncoder().encode(name);
    const namespaceBytes = uuidToBytes(namespace);
    const input = new Uint8Array(namespaceBytes.length + nameBytes.length);
    input.set(namespaceBytes);
    input.set(nameBytes, namespaceBytes.length);

    const digest = sha1(input).slice(0, 16);
    digest[6] = (digest[6] & 0x0f) | 0x50;
    digest[8] = (digest[8] & 0x3f) | 0x80;
    return format(digest);
}
