import { File } from "expo-file-system";

const tmpSibling = (file: File) => new File(file.parentDirectory, `${file.name}.tmp`);

// The sibling is written whole before the main copy goes: a crash mid-write leaves the old copy intact.
export function writeDurably(file: File, text: string): void {
    const tmp = tmpSibling(file);
    tmp.writeSync(text);
    if (file.exists) {
        file.delete();
    }
    tmp.moveSync(file);
}

// A crash between delete and move leaves only the finished sibling, so it is the honest read.
export function readDurably(file: File): string | null {
    if (file.exists) {
        return file.textSync();
    }
    const tmp = tmpSibling(file);
    return tmp.exists ? tmp.textSync() : null;
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
