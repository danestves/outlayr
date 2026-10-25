import { File } from "expo-file-system";

import { duringHandoff } from "@/lib/app-handoff";
import type { previewFiles as iosPreviewFiles } from "@/lib/file-preview";

const FLAG_GRANT_READ_URI_PERMISSION = 1;

export const previewFiles: typeof iosPreviewFiles = async (files, index) => {
    const file = files[index];
    // SAFETY: untyped `require`, asserted to that module's own type.
    const { startActivityAsync } = require("expo-intent-launcher") as typeof import("expo-intent-launcher");
    await duringHandoff(() =>
        startActivityAsync("android.intent.action.VIEW", {
            data: new File(file.uri).contentUri,
            flags: FLAG_GRANT_READ_URI_PERMISSION,
            type: file.pdf ? "application/pdf" : "image/jpeg",
        })
    );
};
