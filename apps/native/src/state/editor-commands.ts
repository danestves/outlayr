import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { guessMapping, parseImportFile } from "@/data/transfer-core";
import { classifyParseFailure, HARD_PARSE_REJECT_CHARS } from "@/domain/import-diagnosis";
import type { ImportFlowEvent } from "@/domain/import-flow";
import { resolveImportMapping } from "@/domain/import-mapping";
import { pickImportFile } from "@/lib/data-transfer";
import type { PickedFile } from "@/lib/data-transfer";
import type { FileStepError } from "@/lib/import-draft-store";

import { createCommand } from "./atom-command";

class TagCreateError extends Schema.TaggedError<TagCreateError>()("TagCreateError", {
    cause: Schema.Defect(),
}) {
    // oxlint-disable-next-line class-methods-use-this -- one cause, no attribute: the message has nothing on the instance to read
    override get message(): string {
        return "The tag could not be created";
    }
}

export const createTagCommand = createCommand({
    execute: (create: Effect.Effect<string | null, unknown>) =>
        create.pipe(Effect.mapError((cause) => new TagCreateError({ cause }))),
    label: "editor:create-tag",
});

export type ChosenImportFile = { error: FileStepError } | { event: ImportFlowEvent };

function readPickedImport(picked: PickedFile): ChosenImportFile {
    if (picked.text.length > HARD_PARSE_REJECT_CHARS) {
        return { error: { cause: "tooLarge" } };
    }
    const parsed = parseImportFile(picked.text);
    if (parsed == null) {
        return { error: { cause: classifyParseFailure(picked.text) } };
    }
    const draft =
        parsed.header == null
            ? {
                  amount: null,
                  category: null,
                  currency: null,
                  date: null,
                  exchangeRate: null,
                  exchangeRateType: null,
                  note: null,
                  type: null,
              }
            : guessMapping(parsed.header);
    const resolution = resolveImportMapping(draft);
    return {
        event: {
            draft,
            file: { chars: picked.text.length, name: picked.name },
            gaps: resolution.ok ? [] : resolution.gaps,
            parsed,
            resolved: resolution.ok ? resolution.value : null,
            type: "fileParsed",
        },
    };
}

export const chooseImportFileCommand = createCommand({
    execute: Effect.fn("Editor.chooseImportFile")(function* chooseImportFile(_input: undefined) {
        const picked = yield* pickImportFile();
        return picked == null ? null : readPickedImport(picked);
    }),
    label: "editor:choose-import-file",
});
