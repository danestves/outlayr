import { openAccounts } from "@/lib/dashboard-series-ledger";
import type { Ledger } from "@/lib/dashboard-series-ledger";
import { columnValues, guessTargets, MAX_FILE_BYTES, readCsvText, readDates } from "@/lib/import-file";
import type { CsvFile, DateRead, FileProblem, Target } from "@/lib/import-file";

import type { PdfRefusal } from "./ai";
import { readStatement } from "./ai";
import { newDraft } from "./draft";
import type { Draft, DraftSource } from "./draft";

export type UploadProblem = FileProblem | PdfRefusal | "cantOpen" | "notPdf";

export type Upload =
    | { kind: "idle" }
    | { file: File; kind: "reading"; phase: "reading" | "uploading" }
    | { file: File | null; kind: "problem"; problem: UploadProblem };

export type ReadOutcome = { draft: Draft; ok: true } | { ok: false; problem: UploadProblem };

const PDF_MAGIC = "%PDF-";
const CSV_NAME = /\.(?:csv|tsv|txt)$/i;

export const baseName = (name: string) => name.replace(/\.[a-z0-9]+$/i, "");

/** The date column read across every row, since a day past 12 may only show up near the end. */
export function datesOf(file: Pick<CsvFile, "rows">, targets: readonly Target[]): DateRead | null {
    const column = targets.indexOf("date");
    if (column === -1) {
        return null;
    }
    const values = columnValues({ header: [], rows: file.rows, width: 0 }, column, file.rows.length).filter(
        (value) => value !== ""
    );
    return values.length === 0 ? { kind: "unreadable" } : readDates(values);
}

export const knownFormat = (read: DateRead | null) => (read?.kind === "known" ? read.format : null);

const defaultAccount = (ledger: Ledger, targets: readonly Target[]) =>
    targets.includes("account") ? null : (openAccounts(ledger.books)[0]?.localId ?? null);

async function readCsv(file: File, source: DraftSource, ledger: Ledger): Promise<ReadOutcome> {
    let text: string;
    try {
        text = await file.text();
    } catch {
        return { ok: false, problem: "cantOpen" };
    }
    const parsed = readCsvText(text);
    if (!parsed.ok) {
        return parsed;
    }
    const read = parsed.file;
    const targets = guessTargets(read);
    return {
        draft: newDraft({
            dateFormat: knownFormat(datesOf(read, targets)),
            header: read.header,
            intoAccountId: defaultAccount(ledger, targets),
            name: baseName(file.name),
            rows: read.rows,
            size: file.size,
            source,
            step: "match",
            targets,
        }),
        ok: true,
    };
}

const STATEMENT_HEADER = ["Date", "Description", "Amount", "Currency"];
const STATEMENT_TARGETS: Target[] = ["date", "merchant", "amount", "currency"];

async function readPdf(
    file: File,
    ledger: Ledger,
    today: string,
    onPhase: (phase: "reading" | "uploading") => void
): Promise<ReadOutcome> {
    const head = await file
        .slice(0, PDF_MAGIC.length)
        .text()
        .catch(() => "");
    if (head !== PDF_MAGIC) {
        return { ok: false, problem: "notPdf" };
    }
    const started = performance.now();
    const answer = await readStatement(file, ledger.books, today, onPhase);
    if (!answer.ok) {
        return { ok: false, problem: answer.reason };
    }
    if (answer.rows.length === 0) {
        return { ok: false, problem: "notRead" };
    }
    const rows = answer.rows.map((row) => [row.date, row.label, String(row.amount), row.currency ?? ""]);
    return {
        draft: newDraft({
            dateFormat: knownFormat(datesOf({ rows }, STATEMENT_TARGETS)),
            header: STATEMENT_HEADER,
            intoAccountId: defaultAccount(ledger, STATEMENT_TARGETS),
            name: baseName(file.name),
            readMs: Math.round(performance.now() - started),
            rows,
            size: file.size,
            source: "pdf",
            step: "resolve",
            suggestions: answer.suggestions,
            targets: STATEMENT_TARGETS,
        }),
        ok: true,
    };
}

export const isPdf = (file: File) => file.type === "application/pdf" || /\.pdf$/i.test(file.name);

export function readImportFile(
    file: File,
    options: {
        ledger: Ledger;
        onPhase: (phase: "reading" | "uploading") => void;
        source: DraftSource;
        today: string;
    }
): Promise<ReadOutcome> {
    if (file.size > MAX_FILE_BYTES) {
        return Promise.resolve({ ok: false, problem: "tooLarge" });
    }
    if (isPdf(file)) {
        return readPdf(file, options.ledger, options.today, options.onPhase);
    }
    if (!CSV_NAME.test(file.name) && file.type !== "text/csv" && file.type !== "text/plain" && file.type !== "") {
        return Promise.resolve({ ok: false, problem: "notCsv" });
    }
    return readCsv(file, options.source, options.ledger);
}
