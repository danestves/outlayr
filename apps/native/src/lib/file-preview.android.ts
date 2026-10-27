import * as Effect from "effect/Effect";
import { File } from "expo-file-system";

import { duringHandoff } from "@/lib/app-handoff";
import type { previewFiles as iosPreviewFiles } from "@/lib/file-preview";
import { FilePreviewError } from "@/lib/file-preview-error";

const FLAG_GRANT_READ_URI_PERMISSION = 1;

const previewFailed = (cause: unknown) => new FilePreviewError({ cause });

export const previewFiles: typeof iosPreviewFiles = Effect.fn("FilePreview.previewFiles")(
    function* previewFiles(files, index) {
        const file = files[index];
        const { startActivityAsync } = yield* Effect.try({
            catch: previewFailed,
            // SAFETY: untyped `require`, asserted to that module's own type.
            try: () => require("expo-intent-launcher") as typeof import("expo-intent-launcher"),
        });
        yield* duringHandoff(
            Effect.tryPromise({
                catch: previewFailed,
                try: () =>
                    startActivityAsync("android.intent.action.VIEW", {
                        data: new File(file.uri).contentUri,
                        flags: FLAG_GRANT_READ_URI_PERMISSION,
                        type: file.pdf ? "application/pdf" : "image/jpeg",
                    }),
            })
        );
    }
);
