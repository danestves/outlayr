import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { getDocumentAsync } from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import { isAvailableAsync, shareAsync } from "expo-sharing";
import { strFromU8 } from "fflate";

import { csvFromArchive, isZip } from "@/domain/import-archive";
import { duringHandoff } from "@/lib/app-handoff";

/** `text/plain` because plenty of banks hand out `.csv` files typed as plain text. */
const CSV_TYPES = ["text/csv", "text/comma-separated-values", "text/plain"];
const ZIP_TYPES = ["application/zip", "public.zip-archive"];

/** Carries a catalog key, not a sentence: every catch site puts it straight into an `Alert` body. */
export class TransferError extends Schema.TaggedError<TransferError>()("TransferError", {
    cause: Schema.optional(Schema.Defect()),
    key: Schema.Literals([
        "alerts.transfer.sharingUnavailable",
        "alerts.transfer.unreadableFile",
        "alerts.transfer.archiveWithoutCsv",
        "alerts.transfer.archiveTooLarge",
        "alerts.dayCard.undrawable",
    ]),
}) {
    override get message(): string {
        return this.key;
    }
}

export class TransferFailedError extends Schema.TaggedError<TransferFailedError>()("TransferFailedError", {
    cause: Schema.Defect(),
    operation: Schema.Literals(["pick", "render", "share"]),
}) {
    override get message(): string {
        return `The ${this.operation} step of the transfer failed`;
    }
}

const failedAt = (operation: typeof TransferFailedError.Type.operation) => (cause: unknown) =>
    new TransferFailedError({ cause, operation });

export const shareFile = Effect.fn("DataTransfer.shareFile")(function* shareFile(
    data: string | Uint8Array,
    fileName: string,
    mimeType: string,
    dialogTitle: string
) {
    const available = yield* Effect.tryPromise({ catch: failedAt("share"), try: () => isAvailableAsync() });
    if (!available) {
        return yield* new TransferError({ key: "alerts.transfer.sharingUnavailable" });
    }
    const file = yield* Effect.try({
        catch: failedAt("share"),
        try: () => {
            const target = new File(Paths.cache, fileName);
            target.create({ intermediates: true, overwrite: true });
            target.writeSync(data);
            return target;
        },
    });
    yield* duringHandoff(
        Effect.tryPromise({ catch: failedAt("share"), try: () => shareAsync(file.uri, { dialogTitle, mimeType }) })
    );
});

export interface PickedFile {
    name: string;
    text: string;
}

export const pickImportFile = Effect.fn("DataTransfer.pickImportFile")(function* pickImportFile() {
    const asset = yield* pickDocument([...CSV_TYPES, ...ZIP_TYPES]);
    if (asset == null) {
        return null;
    }
    const bytes = yield* Effect.tryPromise({
        catch: (cause) => new TransferError({ cause, key: "alerts.transfer.unreadableFile" }),
        try: () => new File(asset.uri).bytes(),
    });
    if (!isZip(bytes)) {
        return { name: asset.name, text: strFromU8(bytes) } satisfies PickedFile;
    }
    const text = yield* Effect.try({
        catch: (cause) => new TransferError({ cause, key: "alerts.transfer.archiveTooLarge" }),
        try: () => csvFromArchive(bytes),
    });
    if (text == null) {
        return yield* new TransferError({ key: "alerts.transfer.archiveWithoutCsv" });
    }
    return { name: asset.name, text } satisfies PickedFile;
});

/** Permissive: iOS reports another app's `.json` under several UTIs, and `parseArchive` vets the contents. */
export const pickArchiveFile = () => pickTextFile(["application/json", "public.json", "public.text"]);

const pickDocument = Effect.fn("DataTransfer.pickDocument")(function* pickDocument(type: string[]) {
    const result = yield* duringHandoff(
        Effect.tryPromise({
            catch: failedAt("pick"),
            try: () =>
                getDocumentAsync({
                    copyToCacheDirectory: true,
                    multiple: false,
                    type,
                }),
        })
    );
    return result.canceled ? null : (result.assets[0] ?? null);
});

const pickTextFile = Effect.fn("DataTransfer.pickTextFile")(function* pickTextFile(type: string[]) {
    const asset = yield* pickDocument(type);
    if (asset == null) {
        return null;
    }

    const text = yield* Effect.tryPromise({
        catch: (cause) => new TransferError({ cause, key: "alerts.transfer.unreadableFile" }),
        try: () => new File(asset.uri).text(),
    });
    return { name: asset.name, text } satisfies PickedFile;
});
