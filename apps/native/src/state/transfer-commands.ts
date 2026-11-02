import * as Effect from "effect/Effect";

import type { DayCardInput } from "@/domain/day-card";
import { layoutRecapCard } from "@/domain/recap-card";
import type { RecapCardInput } from "@/domain/recap-card";
import { pickArchiveFile } from "@/lib/data-transfer";
import { shareCard, shareDayCard } from "@/lib/day-card-image";
import { posthog } from "@/lib/posthog";

import { createCommand } from "./atom-command";

const trackCardShared = (card: "day" | "recap") =>
    Effect.tap(() => Effect.sync(() => posthog?.capture("card_shared", { card })));

export const shareDayCardCommand = createCommand({
    execute: (input: { fileName: string; input: DayCardInput }) =>
        shareDayCard(input.input, input.fileName).pipe(trackCardShared("day")),
    label: "transfer:share-day-card",
});

export const shareRecapCardCommand = createCommand({
    execute: (input: { card: RecapCardInput; dialogTitle: string; fileName: string }) =>
        shareCard(layoutRecapCard(input.card), input.fileName, input.dialogTitle).pipe(trackCardShared("recap")),
    label: "transfer:share-recap-card",
});

export const pickArchiveFileCommand = createCommand({
    execute: (_input: undefined) => pickArchiveFile(),
    label: "transfer:pick-archive-file",
});
