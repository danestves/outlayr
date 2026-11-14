export interface HandOff {
    file: File;
    /** Notion tables arrive as a CSV the flow reads like any other, but history should still say Notion. */
    source: "file" | "notion";
}

let waiting: HandOff | null = null;

/** A file dropped on the Import home rides to the flow that reads it; a File can't travel in a URL. */
export function handOff(file: File, source: HandOff["source"] = "file") {
    waiting = { file, source };
}

export function takeHandOff(): HandOff | null {
    const taken = waiting;
    waiting = null;
    return taken;
}

const MM_BACKUP = /\.mmbackup$/i;
const PDF = /\.pdf$/i;

export function routeOf(file: File): "/app/import/file" | "/app/import/money-manager" {
    return MM_BACKUP.test(file.name) ? "/app/import/money-manager" : "/app/import/file";
}

export const kindOf = (file: File): "csv" | "pdf" =>
    file.type === "application/pdf" || PDF.test(file.name) ? "pdf" : "csv";

/** Reads without taking, for a render that may run twice before the read starts. */
export const peekHandOff = () => waiting;
