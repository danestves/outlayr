import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { getDocumentAsync } from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import { isAvailableAsync, shareAsync } from "expo-sharing";

import { duringHandoff } from "@/lib/app-handoff";

/** `text/plain` because plenty of banks hand out `.csv` files typed as plain text. */
const CSV_TYPES = ["text/csv", "text/comma-separated-values", "text/plain"];

/** Carries a catalog key, not a sentence: every catch site puts it straight into an `Alert` body. */
export class TransferError extends Schema.TaggedError<TransferError>()("TransferError", {
    cause: Schema.optional(Schema.Defect()),
    key: Schema.Literals([
        "alerts.transfer.sharingUnavailable",
        "alerts.transfer.unreadableFile",
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

export const pickCsvFile = () => pickTextFile(CSV_TYPES);

/** Permissive: iOS reports another app's `.json` under several UTIs, and `parseArchive` vets the contents. */
export const pickArchiveFile = () => pickTextFile(["application/json", "public.json", "public.text"]);

const pickTextFile = Effect.fn("DataTransfer.pickTextFile")(function* pickTextFile(type: string[]) {
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
    const asset = result.canceled ? null : result.assets[0];
    if (asset == null) {
        return null;
    }

    const text = yield* Effect.tryPromise({
        catch: (cause) => new TransferError({ cause, key: "alerts.transfer.unreadableFile" }),
        try: () => new File(asset.uri).text(),
    });
    return { name: asset.name, text } satisfies PickedFile;
});
