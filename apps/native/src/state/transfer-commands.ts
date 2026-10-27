import type { DayCardInput } from "@/domain/day-card";
import { pickArchiveFile, pickCsvFile, shareFile } from "@/lib/data-transfer";
import { shareDayCard } from "@/lib/day-card-image";
import { previewFiles } from "@/lib/file-preview";
import type { PreviewFile } from "@/lib/file-preview";

import { createCommand, runAtomCommand, SILENT, unwrapAtomCommand } from "./atom-command";
import type { AtomCommand } from "./atom-command";
import { appAtomRegistry } from "./atom-registry";

export async function runTransferCommand<W, A, E>(command: AtomCommand<W, A, E>, input: W): Promise<A> {
    return unwrapAtomCommand(await runAtomCommand(appAtomRegistry, command, input, SILENT));
}

export const shareFileCommand = createCommand({
    execute: (input: { data: string | Uint8Array; dialogTitle: string; fileName: string; mimeType: string }) =>
        shareFile(input.data, input.fileName, input.mimeType, input.dialogTitle),
    label: "transfer:share-file",
});

export const shareDayCardCommand = createCommand({
    execute: (input: { fileName: string; input: DayCardInput }) => shareDayCard(input.input, input.fileName),
    label: "transfer:share-day-card",
});

export const pickCsvFileCommand = createCommand({
    execute: (_input: undefined) => pickCsvFile(),
    label: "transfer:pick-csv-file",
});

export const pickArchiveFileCommand = createCommand({
    execute: (_input: undefined) => pickArchiveFile(),
    label: "transfer:pick-archive-file",
});

export const previewFilesCommand = createCommand({
    execute: (input: { files: readonly PreviewFile[]; index: number }) => previewFiles(input.files, input.index),
    label: "transfer:preview-files",
});
