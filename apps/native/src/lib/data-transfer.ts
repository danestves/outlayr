import { getDocumentAsync } from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import { isAvailableAsync, shareAsync } from "expo-sharing";

import type { TranslationKey } from "@/i18n/catalog";
import { duringHandoff } from "@/lib/app-handoff";

/** `text/plain` because plenty of banks hand out `.csv` files typed as plain text. */
const CSV_TYPES = ["text/csv", "text/comma-separated-values", "text/plain"];

/** Carries a catalog key, not a sentence: every catch site puts it straight into an `Alert` body. */
export class TransferError extends Error {
    readonly key: TranslationKey;

    constructor(key: TranslationKey, options?: ErrorOptions) {
        super(key, options);
        this.name = "TransferError";
        this.key = key;
    }
}

export async function shareFile(
    data: string | Uint8Array,
    fileName: string,
    mimeType: string,
    dialogTitle: string
): Promise<void> {
    if (!(await isAvailableAsync())) {
        throw new TransferError("alerts.transfer.sharingUnavailable");
    }
    const file = new File(Paths.cache, fileName);
    file.create({ intermediates: true, overwrite: true });
    file.writeSync(data);
    await duringHandoff(() => shareAsync(file.uri, { dialogTitle, mimeType }));
}

export interface PickedFile {
    name: string;
    text: string;
}

export async function pickCsvFile(): Promise<PickedFile | null> {
    return await pickTextFile(CSV_TYPES);
}

/** Permissive: iOS reports another app's `.json` under several UTIs, and `parseArchive` vets the contents. */
export async function pickArchiveFile(): Promise<PickedFile | null> {
    return await pickTextFile(["application/json", "public.json", "public.text"]);
}

async function pickTextFile(type: string[]): Promise<PickedFile | null> {
    const result = await duringHandoff(() =>
        getDocumentAsync({
            copyToCacheDirectory: true,
            multiple: false,
            type,
        })
    );
    const asset = result.canceled ? null : result.assets[0];
    if (asset == null) {
        return null;
    }

    let text: string;
    try {
        text = await new File(asset.uri).text();
    } catch (error) {
        throw new TransferError("alerts.transfer.unreadableFile", { cause: error });
    }
    return { name: asset.name, text };
}
