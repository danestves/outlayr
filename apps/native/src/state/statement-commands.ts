import { MAX_PDF_BYTES } from "@outlayr/backend/confect/pdfImport.spec";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import type * as HttpClient from "effect/http/HttpClient";
import * as Result from "effect/Result";

import type { ImportFlowEvent } from "@/domain/import-flow";
import { resolveImportMapping } from "@/domain/import-mapping";
import { STATEMENT_DRAFT, statementToParsedImport } from "@/domain/import-statement";
import type { TranslationKey } from "@/i18n/catalog";
import { pdfImport } from "@/lib/cloud-ai";
import type { PdfImportRefusal, PdfImportRequest } from "@/lib/cloud-ai";
import { pickPdfFile } from "@/lib/data-transfer";
import type { TransferError, TransferFailedError } from "@/lib/data-transfer";
import type { FileStepError } from "@/lib/import-draft-store";
import { appRuntime } from "@/lib/runtime";

import { createRuntimeCommand } from "./atom-command";
import type { ChosenImportFile } from "./editor-commands";

// A long statement is several model calls on top of the upload, each with its own budget on the server.
const STATEMENT_TIMEOUT = Duration.minutes(4);

const REFUSAL_COPY = {
    invalidResponse: "import.unavailableInvalidResponse",
    notConfigured: "import.unavailableNotConfigured",
    providerError: "import.unavailableProviderError",
    rateLimited: "import.statementRateLimited",
    unauthenticated: "import.unavailableUnauthenticated",
} satisfies Partial<Record<PdfImportRefusal, TranslationKey>>;

function refusalError(reason: PdfImportRefusal): FileStepError {
    switch (reason) {
        case "extractionFailed": {
            return { cause: "extractionFailed" };
        }
        case "invalid": {
            return { cause: "tooLarge" };
        }
        case "notEntitled": {
            return { cause: "notEntitled" };
        }
        default: {
            return { cause: "io", key: REFUSAL_COPY[reason] };
        }
    }
}

export const chooseStatementCommand = createRuntimeCommand(appRuntime, {
    execute: Effect.fn("Statement.choose")(function* choose(
        input: Omit<PdfImportRequest, "bytes">
    ): Effect.fn.Return<ChosenImportFile | null, TransferError | TransferFailedError, HttpClient.HttpClient> {
        const picked = yield* pickPdfFile(MAX_PDF_BYTES);
        if (picked == null) {
            return null;
        }
        if (picked === "tooLarge" || picked.bytes.length > MAX_PDF_BYTES) {
            return { error: { cause: "tooLarge" } };
        }
        const answer = yield* pdfImport({ ...input, bytes: picked.bytes }).pipe(
            Effect.timeout(STATEMENT_TIMEOUT),
            Effect.result
        );
        if (Result.isFailure(answer)) {
            return {
                error: {
                    cause: "io",
                    key:
                        answer.failure._tag === "TimeoutError"
                            ? "import.unavailableTimeout"
                            : "import.unavailableOffline",
                },
            };
        }
        const reply = answer.success;
        if (!reply.ok) {
            return { error: refusalError(reply.reason) };
        }
        const parsed = statementToParsedImport(reply.rows);
        const resolution = resolveImportMapping(STATEMENT_DRAFT);
        const event: ImportFlowEvent = {
            draft: STATEMENT_DRAFT,
            // The rows, not the PDF: this guards the CSV fallback's cap on what it would read.
            file: { chars: parsed.rows.flat().join("").length, name: picked.name },
            gaps: resolution.ok ? [] : resolution.gaps,
            parsed,
            resolved: resolution.ok ? resolution.value : null,
            statement: { complete: reply.complete, suggestions: reply.suggestions },
            type: "fileParsed",
        };
        return { event };
    }),
    label: "statement:choose",
});
