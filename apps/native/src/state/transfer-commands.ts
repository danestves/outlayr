import type { DayCardInput } from "@/domain/day-card";
import { layoutRecapCard } from "@/domain/recap-card";
import type { RecapCardInput } from "@/domain/recap-card";
import { pickArchiveFile } from "@/lib/data-transfer";
import { shareCard, shareDayCard } from "@/lib/day-card-image";

import { createCommand } from "./atom-command";

export const shareDayCardCommand = createCommand({
    execute: (input: { fileName: string; input: DayCardInput }) => shareDayCard(input.input, input.fileName),
    label: "transfer:share-day-card",
});

export const shareRecapCardCommand = createCommand({
    execute: (input: { card: RecapCardInput; dialogTitle: string; fileName: string }) =>
        shareCard(layoutRecapCard(input.card), input.fileName, input.dialogTitle),
    label: "transfer:share-recap-card",
});

export const pickArchiveFileCommand = createCommand({
    execute: (_input: undefined) => pickArchiveFile(),
    label: "transfer:pick-archive-file",
});
