import { useRef, useState } from "react";

import { guessMapping, parseImportFile } from "@/data/transfer-core";
import type { ParsedImportFile } from "@/data/transfer-core";
import { classifyParseFailure, HARD_PARSE_REJECT_CHARS } from "@/domain/import-diagnosis";
import { resolveImportMapping } from "@/domain/import-mapping";
import { TransferError } from "@/lib/data-transfer";
import { importDraftStore } from "@/lib/import-draft-store";
import { pickCsvFileCommand, runTransferCommand } from "@/state/transfer-commands";

async function readChosenFile(setStatus: (status: "idle" | "loading") => void) {
    try {
        const picked = await runTransferCommand(pickCsvFileCommand, undefined);
        if (picked == null) {
            setStatus("idle");
            return;
        }
        if (picked.text.length > HARD_PARSE_REJECT_CHARS) {
            setStatus("idle");
            importDraftStore.setFileError({ cause: "tooLarge" });
            return;
        }
        const parsed: ParsedImportFile | null = parseImportFile(picked.text);
        if (parsed == null) {
            setStatus("idle");
            importDraftStore.setFileError({
                cause: classifyParseFailure(picked.text),
            });
            return;
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
        importDraftStore.dispatch({
            draft,
            file: { chars: picked.text.length, name: picked.name },
            gaps: resolution.ok ? [] : resolution.gaps,
            parsed,
            resolved: resolution.ok ? resolution.value : null,
            type: "fileParsed",
        });
        setStatus("idle");
    } catch (thrown) {
        setStatus("idle");
        importDraftStore.setFileError(
            thrown instanceof TransferError
                ? { cause: "io", key: thrown.key }
                : { cause: "io", key: "alerts.transfer.unreadableFile" }
        );
    }
}

export function useChooseImportFile() {
    const [status, setStatus] = useState<"idle" | "loading">("idle");
    const picking = useRef(false);

    const choose = async () => {
        if (picking.current) {
            return;
        }
        picking.current = true;
        setStatus("loading");
        importDraftStore.setFileError(null);
        await readChosenFile(setStatus).finally(() => {
            picking.current = false;
        });
    };

    return { choose, status };
}
