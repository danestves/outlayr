import type { BackupSource } from "./money-manager-file";

const FILE_URL = /^(?:file|content):\/\//i;
const BACKUP_EXTENSION = /\.mmbackup$/i;
const FALLBACK_NAME = "backup.mmbackup";

/**
 * A file handed to Outlayr by "Open in" or the share sheet, or null for an ordinary deep link. A cold start brings
 * the raw `file://` or `content://` URL; a running app can get the bare path, which only the extension gives away.
 */
export function backupHandover(path: string): BackupSource | null {
    const bare = path.split("?")[0] ?? path;
    if (FILE_URL.test(path)) {
        return { name: fileName(bare), uri: path };
    }
    if (bare.startsWith("/") && BACKUP_EXTENSION.test(bare)) {
        return { name: fileName(bare), uri: `file://${bare}` };
    }
    return null;
}

function fileName(path: string): string {
    const last = path.split("/").at(-1) ?? "";
    try {
        return decodeURIComponent(last) || FALLBACK_NAME;
    } catch {
        return last || FALLBACK_NAME;
    }
}
