import type { DayCardInput } from "@/domain/day-card";
import { pickArchiveFile } from "@/lib/data-transfer";
import { shareDayCard } from "@/lib/day-card-image";

import { createCommand } from "./atom-command";

export const shareDayCardCommand = createCommand({
    execute: (input: { fileName: string; input: DayCardInput }) => shareDayCard(input.input, input.fileName),
    label: "transfer:share-day-card",
});

export const pickArchiveFileCommand = createCommand({
    execute: (_input: undefined) => pickArchiveFile(),
    label: "transfer:pick-archive-file",
});
