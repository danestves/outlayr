export interface ImageInfo {
    contentType: string;
    size: number;
}

const PNG = [0x89, 0x50, 0x4e, 0x47];
const JPEG = [0xff, 0xd8, 0xff];
const ICO = [0x00, 0x00, 0x01, 0x00];
const RIFF = [0x52, 0x49, 0x46, 0x46];
const WEBP = [0x57, 0x45, 0x42, 0x50];

const PNG_MIN_BYTES = 24;
const ICO_ENTRY_BYTES = 16;
const ICO_HEADER_BYTES = 6;
const ICO_FULL_SIZE = 256;
const WEBP_DIMENSION = 16_384;
const JPEG_SOF_FIRST = 0xc0;
const JPEG_SOF_LAST = 0xcf;
const JPEG_MARKERS_WITHOUT_SIZE = new Set([0xc4, 0xc8, 0xcc]);

const startsWith = (bytes: Uint8Array, signature: readonly number[], offset = 0) =>
    bytes.length >= offset + signature.length && signature.every((byte, index) => bytes[offset + index] === byte);

function pngSize(bytes: Uint8Array): number | null {
    if (bytes.length < PNG_MIN_BYTES) {
        return null;
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return Math.min(view.getUint32(16), view.getUint32(20));
}

function icoSize(bytes: Uint8Array): number | null {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (bytes.length < ICO_HEADER_BYTES) {
        return null;
    }
    const count = view.getUint16(4, true);
    let largest = 0;
    for (let index = 0; index < count; index += 1) {
        const entry = ICO_HEADER_BYTES + index * ICO_ENTRY_BYTES;
        if (entry + ICO_ENTRY_BYTES > bytes.length) {
            break;
        }
        const width = bytes[entry] || ICO_FULL_SIZE;
        const height = bytes[entry + 1] || ICO_FULL_SIZE;
        largest = Math.max(largest, Math.min(width, height));
    }
    return largest > 0 ? largest : null;
}

function jpegSize(bytes: Uint8Array): number | null {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let offset = 2;
    while (offset + 9 < bytes.length) {
        if (bytes[offset] !== 0xff) {
            return null;
        }
        const marker = bytes[offset + 1] ?? 0;
        if (marker >= JPEG_SOF_FIRST && marker <= JPEG_SOF_LAST && !JPEG_MARKERS_WITHOUT_SIZE.has(marker)) {
            return Math.min(view.getUint16(offset + 5), view.getUint16(offset + 7));
        }
        offset += 2 + view.getUint16(offset + 2);
    }
    return null;
}

function webpSize(bytes: Uint8Array): number | null {
    if (bytes.length < 30) {
        return null;
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const chunk = String.fromCodePoint(...bytes.subarray(12, 16));
    if (chunk === "VP8 ") {
        return Math.min(view.getUint16(26, true) % WEBP_DIMENSION, view.getUint16(28, true) % WEBP_DIMENSION);
    }
    if (chunk === "VP8L") {
        const packed = view.getUint32(21, true);
        return Math.min((packed % WEBP_DIMENSION) + 1, (Math.floor(packed / WEBP_DIMENSION) % WEBP_DIMENSION) + 1);
    }
    if (chunk === "VP8X") {
        const threeBytes = (at: number) =>
            (bytes[at] ?? 0) + (bytes[at + 1] ?? 0) * 256 + (bytes[at + 2] ?? 0) * 65_536;
        return Math.min(threeBytes(24), threeBytes(27)) + 1;
    }
    return null;
}

const read = (contentType: string, size: number | null) => (size === null ? null : { contentType, size });

export function imageInfo(bytes: Uint8Array): ImageInfo | null {
    if (startsWith(bytes, PNG)) {
        return read("image/png", pngSize(bytes));
    }
    if (startsWith(bytes, JPEG)) {
        return read("image/jpeg", jpegSize(bytes));
    }
    if (startsWith(bytes, ICO)) {
        return read("image/x-icon", icoSize(bytes));
    }
    if (startsWith(bytes, RIFF) && startsWith(bytes, WEBP, 8)) {
        return read("image/webp", webpSize(bytes));
    }
    return null;
}
