import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { requireOptionalNativeModule } from "expo";
import { shareAsync } from "expo-sharing";

import { duringHandoff } from "@/lib/app-handoff";

export interface PreviewFile {
    title: string | null;
    uri: string;
    pdf: boolean;
}

export class FilePreviewError extends Schema.TaggedError<FilePreviewError>()("FilePreviewError", {
    cause: Schema.Defect(),
}) {
    // oxlint-disable-next-line class-methods-use-this -- one cause, no attribute: the message has nothing on the instance to read
    override get message(): string {
        return "The attachment could not be opened";
    }
}

interface FilePreviewModule {
    open: (uris: string[], titles: string[], index: number) => Promise<void>;
}

const previewFailed = (cause: unknown) => new FilePreviewError({ cause });

const filePreview = requireOptionalNativeModule<FilePreviewModule>("FilePreview");

export const previewFiles = Effect.fn("FilePreview.previewFiles")(function* previewFiles(
    files: readonly PreviewFile[],
    index: number
) {
    if (filePreview === null) {
        yield* duringHandoff(Effect.tryPromise({ catch: previewFailed, try: () => shareAsync(files[index].uri) }));
        return;
    }
    yield* Effect.tryPromise({
        catch: previewFailed,
        try: () =>
            filePreview.open(
                files.map((file) => file.uri),
                files.map((file) => file.title ?? ""),
                index
            ),
    });
});
