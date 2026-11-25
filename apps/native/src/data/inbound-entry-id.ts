import { sha256 } from "@noble/hashes/sha2.js";

const INBOUND_PREFIX = "inbound:";
const INBOUND_KEY_PREFIX = "outlayr-inbound:";

export const BANK_KEY_PREFIX = "bank:";

const BANK_ID_PREFIX = "outlayr-bank:";

const hex = (bytes: Uint8Array) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

function entryId(input: string): string {
    const bytes = sha256(new TextEncoder().encode(input)).slice(0, 16);
    bytes[6] = 0x50 + ((bytes[6] ?? 0) % 16);
    bytes[8] = 0x80 + ((bytes[8] ?? 0) % 64);
    const digest = hex(bytes);
    return [
        digest.slice(0, 8),
        digest.slice(8, 12),
        digest.slice(12, 16),
        digest.slice(16, 20),
        digest.slice(20, 32),
    ].join("-");
}

// Same id on every device that adopts the row, so sync upserts one transaction instead of two.
export function inboundEntryId(pendingWriteId: string): string | null {
    if (!pendingWriteId.startsWith(INBOUND_PREFIX)) {
        return null;
    }
    const rowId = pendingWriteId.slice(INBOUND_PREFIX.length);
    if (rowId.length === 0) {
        return null;
    }
    return entryId(`${INBOUND_KEY_PREFIX}${rowId}`);
}

/** One row per bank transaction, named by its key so a later write finds it from any device. */
export function bankEntryId(key: string): string {
    return entryId(`${BANK_ID_PREFIX}${key}`);
}
