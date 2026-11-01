import { Alert } from "react-native";

import { LinkRow } from "@/components/list/list-row";
import { useDatabase } from "@/contexts/local-data-context";
import { useLastImport } from "@/data/last-import";
import { formatTargetDate } from "@/domain/dates";
import { tc } from "@/domain/money-manager/count-labels";
import { useTranslation } from "@/i18n/context";
import { notifyFailure } from "@/lib/notify";
import { SILENT } from "@/state/atom-command";
import { undoImportCommand } from "@/state/ledger-commands";
import { useAtomAction } from "@/state/use-atom-action";

/** Shown under Settings › Data only while an import can still be taken back. */
export function UndoImportRow() {
    const db = useDatabase();
    const t = useTranslation();
    const last = useLastImport(db);
    const undo = useAtomAction(
        undoImportCommand,
        { onFailure: () => notifyFailure({ title: t("mmImport.undo.failed") }) },
        SILENT
    );
    if (last === null) {
        return null;
    }

    return (
        <LinkRow
            destructive
            detail={t("mmImport.undo.rowDetail", {
                date: formatTargetDate(new Date(last.importedAt)),
                entries: tc(t, "mmImport.count.entries", last.entries),
            })}
            icon="ArchiveRestore"
            noChevron
            onPress={() =>
                Alert.alert(t("mmImport.undo.title"), t("mmImport.undo.body"), [
                    { style: "cancel", text: t("common.cancel") },
                    {
                        onPress: () => undo({ db, kind: last.kind }),
                        style: "destructive",
                        text: t("mmImport.undo.confirm"),
                    },
                ])
            }
            title={t(last.kind === "csv" ? "settings.import.undoRow" : "mmImport.undo.row")}
        />
    );
}
