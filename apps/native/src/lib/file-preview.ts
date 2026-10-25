import { requireOptionalNativeModule } from "expo";
import { shareAsync } from "expo-sharing";

import { duringHandoff } from "@/lib/app-handoff";

export interface PreviewFile {
    title: string | null;
    uri: string;
    pdf: boolean;
}

interface FilePreviewModule {
    open: (uris: string[], titles: string[], index: number) => Promise<void>;
}

const filePreview = requireOptionalNativeModule<FilePreviewModule>("FilePreview");

export async function previewFiles(files: readonly PreviewFile[], index: number): Promise<void> {
    if (filePreview === null) {
        await duringHandoff(() => shareAsync(files[index].uri));
        return;
    }
    await filePreview.open(
        files.map((file) => file.uri),
        files.map((file) => file.title ?? ""),
        index
    );
}
