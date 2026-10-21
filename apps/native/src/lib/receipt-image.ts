import { FilterMode, ImageFormat, MipmapMode, Skia } from "@shopify/react-native-skia";
import type { SkImage } from "@shopify/react-native-skia";

/** The server accepts 900KB (`receiptScan.ts:MAX_IMAGE_BYTES`); the margin covers the value's wire overhead. */
const MAX_UPLOAD_BYTES = 850_000;
const FIRST_LONG_EDGE = 1600;
const MIN_LONG_EDGE = 800;
const FIRST_QUALITY = 78;
const MIN_QUALITY = 55;

export interface PreparedReceipt {
    bytes: ArrayBuffer;
    height: number;
    width: number;
}

function encodeAt(image: SkImage, longEdge: number, quality: number): Uint8Array | null {
    const width = image.width();
    const height = image.height();
    const scale = Math.min(1, longEdge / Math.max(width, height));
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));
    const surface = Skia.Surface.MakeOffscreen(targetWidth, targetHeight);
    if (surface == null) {
        return null;
    }
    surface
        .getCanvas()
        .drawImageRectOptions(
            image,
            Skia.XYWHRect(0, 0, width, height),
            Skia.XYWHRect(0, 0, targetWidth, targetHeight),
            FilterMode.Linear,
            MipmapMode.Linear
        );
    surface.flush();
    const encoded = surface.makeImageSnapshot().encodeToBytes(ImageFormat.JPEG, quality);
    return encoded.length > 0 ? encoded : null;
}

export async function prepareReceiptImage(sourceUri: string): Promise<PreparedReceipt | null> {
    let image: SkImage | null;
    try {
        const data = await Skia.Data.fromURI(sourceUri);
        image = Skia.Image.MakeImageFromEncoded(data);
    } catch {
        return null;
    }
    if (image == null) {
        return null;
    }
    const attempts: { longEdge: number; quality: number }[] = [
        { longEdge: FIRST_LONG_EDGE, quality: FIRST_QUALITY },
        { longEdge: 1280, quality: 72 },
        { longEdge: 1024, quality: 65 },
        { longEdge: MIN_LONG_EDGE, quality: MIN_QUALITY },
    ];
    for (const attempt of attempts) {
        const encoded = encodeAt(image, attempt.longEdge, attempt.quality);
        if (encoded !== null && encoded.byteLength <= MAX_UPLOAD_BYTES) {
            const scale = Math.min(1, attempt.longEdge / Math.max(image.width(), image.height()));
            return {
                // SAFETY: `new Uint8Array(bytes)` allocates its own plain ArrayBuffer (never a
                // SharedArrayBuffer) exactly the length of the copy, which is what the client sends.
                bytes: new Uint8Array(encoded).buffer as ArrayBuffer,
                height: Math.round(image.height() * scale),
                width: Math.round(image.width() * scale),
            };
        }
    }
    return null;
}
