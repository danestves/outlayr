import * as Cause from "effect/Cause";
import { useRef, useState } from "react";

import { useAppSettings } from "@/contexts/display-settings-context";
import { useDatabase } from "@/contexts/local-data-context";
import { useCategoryMeta } from "@/data/categories";
import { remoteEnrichmentOn } from "@/data/settings-core";
import { buildCategoryTree } from "@/hooks/use-csv-import";
import { useProEntitled } from "@/hooks/use-pro-locked";
import { useRegionCode } from "@/hooks/use-region-code";
import { TransferError } from "@/lib/data-transfer";
import { importDraftStore } from "@/lib/import-draft-store";
import { SILENT } from "@/state/atom-command";
import { chooseImportFileCommand } from "@/state/editor-commands";
import type { ChosenImportFile } from "@/state/editor-commands";
import { chooseStatementCommand } from "@/state/statement-commands";
import { useAtomAction } from "@/state/use-atom-action";

function localDay(now: Date): string {
    const month = `${now.getMonth() + 1}`.padStart(2, "0");
    const day = `${now.getDate()}`.padStart(2, "0");
    return `${now.getFullYear()}-${month}-${day}`;
}

export function useChooseImportFile() {
    const [status, setStatus] = useState<"idle" | "loading">("idle");
    const picking = useRef(false);
    const meta = useCategoryMeta(useDatabase());
    const settings = useAppSettings().state;
    const regionCode = useRegionCode();
    const entitled = useProEntitled();

    const handlers = {
        onFailure: (cause: Cause.Cause<unknown>) => {
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
        onSuccess: (chosen: ChosenImportFile | null) => {
            if (chosen == null) {
                return;
            }
            if ("error" in chosen) {
                importDraftStore.setFileError(chosen.error);
                return;
            }
            importDraftStore.dispatch(chosen.event);
        },
    };
    const pickFile = useAtomAction(chooseImportFileCommand, handlers, SILENT);
    const pickStatement = useAtomAction(chooseStatementCommand, handlers, SILENT);

    const chooseStatement = () => {
        if (!remoteEnrichmentOn(settings.bool)) {
            importDraftStore.setFileError({ cause: "aiOff" });
            return;
        }
        if (!entitled) {
            importDraftStore.setFileError({ cause: "notEntitled" });
            return;
        }
        picking.current = true;
        setStatus("loading");
        importDraftStore.setFileError(null);
        pickStatement({
            categoryTree: buildCategoryTree(meta),
            groundedLookup: settings.bool("groundedLookup"),
            regionCode,
            today: localDay(new Date()),
        });
    };

    const choose = () => {
        if (picking.current) {
            return;
        }
        if (importDraftStore.getSnapshot().flow.sourceId === "pdf") {
            chooseStatement();
            return;
        }
        picking.current = true;
        setStatus("loading");
        importDraftStore.setFileError(null);
        pickFile(undefined);
    };

    return { choose, status };
}
