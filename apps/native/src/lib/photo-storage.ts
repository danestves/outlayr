import { FilterMode, ImageFormat, MipmapMode, Skia } from "@shopify/react-native-skia";
import type { SkData } from "@shopify/react-native-skia";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { Directory, File, Paths } from "expo-file-system";

import { MAX_ATTACHMENT_BYTES } from "@/data/attachments-core";
import { PHOTO_DIRECTORY, photoExtension, photoFileName } from "@/data/photo-store-core";
import type { PhotoFiles } from "@/data/photo-store-core";
import { newId } from "@/domain/ids";
import { decodeImage, drawOnPlate } from "@/lib/logo-plating";
import { prepareReceiptImage } from "@/lib/receipt-image";

export class PhotoStorageError extends Schema.TaggedError<PhotoStorageError>()("PhotoStorageError", {
    cause: Schema.Defect(),
    operation: Schema.Literals(["photo", "logo", "attachment"]),
}) {
    override get message(): string {
        return `Storing the ${this.operation} failed`;
    }
}

const failedPhoto = (cause: unknown) => new PhotoStorageError({ cause, operation: "photo" });
const failedLogo = (cause: unknown) => new PhotoStorageError({ cause, operation: "logo" });

/** Matches Swift `TransactionImageIngestion.maxDimension`: a photo is never drawn past the 132pt identity well. */
const MAX_DIMENSION = 512;
const JPEG_QUALITY = 80;

function photoDirectory(): Directory {
    const directory = new Directory(Paths.document, PHOTO_DIRECTORY);
    directory.create({ idempotent: true, intermediates: true });
    return directory;
}

export const photoFiles: PhotoFiles = {
    adopt(sourceUri, name) {
        const source = new File(sourceUri);
        if (!source.exists) {
            return false;
        }
        source.copySync(new File(photoDirectory(), name), { overwrite: true });
        return true;
    },
    get directoryUri() {
        return photoDirectory().uri;
    },

    list() {
        return photoDirectory()
            .list()
            .filter((entry): entry is File => entry instanceof File)
            .map((file) => ({ modifiedAt: file.lastModified ?? 0, name: file.name }));
    },

    read(name) {
        const file = new File(photoDirectory(), name);
        return file.exists ? file.bytesSync() : null;
    },

    remove(name) {
        const file = new File(photoDirectory(), name);
        if (file.exists) {
            file.delete();
        }
    },

    write(name, bytes) {
        const file = new File(photoDirectory(), name);
        file.create({ overwrite: true });
        file.writeSync(bytes);
    },
};

function encodeDownscaled(data: SkData): Uint8Array | null {
    const image = Skia.Image.MakeImageFromEncoded(data);
    if (image == null) {
        return null;
    }

    const width = image.width();
    const height = image.height();
    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
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
    const encoded = surface.makeImageSnapshot().encodeToBytes(ImageFormat.JPEG, JPEG_QUALITY);
    return encoded.length > 0 ? encoded : null;
}

/** Null on any Skia failure, so a photo the decoder cannot handle is stored at full size instead of lost. */
const downscaleToJpeg = (sourceUri: string) =>
    Effect.tryPromise(() => Skia.Data.fromURI(sourceUri)).pipe(
        Effect.flatMap((data) => Effect.try(() => encodeDownscaled(data))),
        Effect.orElseSucceed(() => null)
    );

/** The picker's path is in a cache the system may reclaim, so only the returned uri is safe to write to a row. */
export const persistPickedPhoto = Effect.fn("PhotoStorage.persistPickedPhoto")(function* persistPickedPhoto(
    sourceUri: string
) {
    const directory = yield* Effect.try({ catch: failedPhoto, try: photoDirectory });
    const encoded = yield* downscaleToJpeg(sourceUri);

    if (encoded != null) {
        return yield* Effect.try({
            catch: failedPhoto,
            try: () => {
                const target = new File(directory, `${newId()}.jpg`);
                target.create({ overwrite: true });
                target.writeSync(encoded);
                return target.uri;
            },
        });
    }

    return yield* Effect.try({
        catch: failedPhoto,
        try: () => {
            const target = new File(directory, `${newId()}${photoExtension(photoFileName(sourceUri))}`);
            new File(sourceUri).copySync(target, { overwrite: true });
            return target.uri;
        },
    });
});

function platedLogoJpeg(bytes: Uint8Array): Uint8Array | null {
    try {
        const image = decodeImage(bytes);
        const tile = image == null ? null : drawOnPlate(image, MAX_DIMENSION);
        const encoded = tile?.encodeToBytes(ImageFormat.JPEG, JPEG_QUALITY);
        return encoded != null && encoded.length > 0 ? encoded : null;
    } catch {
        return null;
    }
}

/**
 * A transparent or edge-tight logo is plated first, since JPEG would turn its see-through pixels black. Either
 * re-encode also neutralises anything hiding behind a valid image header.
 */
export const persistLogoBytes = Effect.fn("PhotoStorage.persistLogoBytes")(function* persistLogoBytes(
    bytes: Uint8Array
) {
    const plated = platedLogoJpeg(bytes);
    if (plated != null) {
        return yield* Effect.try({
            catch: failedLogo,
            try: () => {
                const target = new File(photoDirectory(), `${newId()}.jpg`);
                target.create({ overwrite: true });
                target.writeSync(plated);
                return target.uri;
            },
        });
    }

    return yield* Effect.acquireUseRelease(
        Effect.try({
            catch: failedLogo,
            try: () => {
                const temp = new File(Paths.cache, `${newId()}.img`);
                temp.create({ overwrite: true });
                temp.writeSync(bytes);
                return temp;
            },
        }),
        (temp) => persistPickedPhoto(temp.uri),
        (temp) => Effect.try({ catch: failedLogo, try: () => temp.delete() }).pipe(Effect.orDie)
    );
});

export type AttachmentIntake = { imageUri: string; name: string | null } | { failure: "tooLarge" | "unreadable" };

const PDF_SIGNATURE = "%PDF-";

function writeAttachment(bytes: Uint8Array, extension: ".jpg" | ".pdf"): string {
    const target = new File(photoDirectory(), `${newId()}${extension}`);
    target.create({ overwrite: true });
    target.writeSync(bytes);
    return target.uri;
}

export function persistAttachmentBytes(bytes: Uint8Array): string {
    return writeAttachment(bytes, ".jpg");
}

export const persistAttachmentPhoto = Effect.fn("PhotoStorage.persistAttachmentPhoto")(function* persistAttachmentPhoto(
    sourceUri: string
) {
    const prepared = yield* prepareReceiptImage(sourceUri).pipe(
        Effect.mapError((cause) => new PhotoStorageError({ cause, operation: "attachment" }))
    );
    if (prepared === null) {
        return { failure: "unreadable" } satisfies AttachmentIntake;
    }
    return yield* Effect.try({
        catch: (cause) => new PhotoStorageError({ cause, operation: "attachment" }),
        try: (): AttachmentIntake => ({
            imageUri: writeAttachment(new Uint8Array(prepared.bytes), ".jpg"),
            name: null,
        }),
    });
});

export function persistAttachmentPdf(sourceUri: string, name: string | null): AttachmentIntake {
    const source = new File(sourceUri);
    if (!source.exists) {
        return { failure: "unreadable" };
    }
    if (source.size > MAX_ATTACHMENT_BYTES) {
        return { failure: "tooLarge" };
    }
    const bytes = source.bytesSync();
    if (String.fromCodePoint(...bytes.subarray(0, PDF_SIGNATURE.length)) !== PDF_SIGNATURE) {
        return { failure: "unreadable" };
    }
    return { imageUri: writeAttachment(bytes, ".pdf"), name };
}

export function storedPhotosBase64(): Record<string, string> {
    return Object.fromEntries(
        photoDirectory()
            .list()
            .filter((entry): entry is File => entry instanceof File)
            .map((file) => [file.name, file.base64Sync()])
    );
}

export function writePhotosBase64(photos: Record<string, string>): void {
    const directory = photoDirectory();
    for (const [name, data] of Object.entries(photos)) {
        const file = new File(directory, name);
        file.create({ overwrite: true });
        file.writeSync(data, { encoding: "base64" });
    }
}

export function clearStoredPhotos(): void {
    const directory = new Directory(Paths.document, PHOTO_DIRECTORY);
    if (directory.exists) {
        directory.delete();
    }
}
