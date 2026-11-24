import { File } from "expo-file-system";

const tmpSibling = (file: File) => new File(file.parentDirectory, `${file.name}.tmp`);

// A crash between delete and move leaves only the finished sibling. It must become the main copy before anything
// rewrites the sibling or appends to a fresh main, or the only good copy is lost.
export function recoverDurably(file: File): void {
    const tmp = tmpSibling(file);
    if (!file.exists && tmp.exists) {
        tmp.moveSync(file);
    }
}

// The sibling is written whole before the main copy goes: a crash mid-write leaves the old copy intact.
export function writeDurably(file: File, text: string): void {
    recoverDurably(file);
    const tmp = tmpSibling(file);
    tmp.writeSync(text);
    if (file.exists) {
        file.delete();
    }
    tmp.moveSync(file);
}

export function readDurably(file: File): string | null {
    recoverDurably(file);
    return file.exists ? file.textSync() : null;
}

export function clearDurably(file: File): void {
    if (file.exists) {
        file.delete();
    }
    const tmp = tmpSibling(file);
    if (tmp.exists) {
        tmp.delete();
    }
}
