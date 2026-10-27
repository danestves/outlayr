import * as Cause from "effect/Cause";
import { useRef, useState } from "react";

import { TransferError } from "@/lib/data-transfer";
import { importDraftStore } from "@/lib/import-draft-store";
import { SILENT } from "@/state/atom-command";
import { chooseImportFileCommand } from "@/state/editor-commands";
import { useAtomAction } from "@/state/use-atom-action";

export function useChooseImportFile() {
    const [status, setStatus] = useState<"idle" | "loading">("idle");
    const picking = useRef(false);

    const pickFile = useAtomAction(
        chooseImportFileCommand,
        {
            onFailure: (cause) => {
                const thrown = Cause.squash(cause);
                importDraftStore.setFileError(
                    thrown instanceof TransferError
                        ? { cause: "io", key: thrown.key }
                        : { cause: "io", key: "alerts.transfer.unreadableFile" }
                );
            },
            onSettled: () => {
                setStatus("idle");
                picking.current = false;
            },
            onSuccess: (chosen) => {
                if (chosen == null) {
                    return;
                }
                if ("error" in chosen) {
                    importDraftStore.setFileError(chosen.error);
                    return;
                }
                importDraftStore.dispatch(chosen.event);
            },
        },
        SILENT
    );

    const choose = () => {
        if (picking.current) {
            return;
        }
        picking.current = true;
        setStatus("loading");
        importDraftStore.setFileError(null);
        pickFile(undefined);
    };

    return { choose, status };
}
