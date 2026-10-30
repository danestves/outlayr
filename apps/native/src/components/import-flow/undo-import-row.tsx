import { Alert } from "react-native";

import { LinkRow } from "@/components/list/list-row";
import { useDatabase } from "@/contexts/local-data-context";
import { useLastMoneyManagerImport } from "@/data/money-manager-import";
import { formatTargetDate } from "@/domain/dates";
import { tc } from "@/domain/money-manager/count-labels";
import { useTranslation } from "@/i18n/context";
import { notifyFailure } from "@/lib/notify";
import { SILENT } from "@/state/atom-command";
import { undoMoneyManagerImportCommand } from "@/state/money-manager-commands";
import { useAtomAction } from "@/state/use-atom-action";

/** Shown under Settings › Data only while an import can still be taken back. */
export function UndoImportRow() {
    const db = useDatabase();
    const t = useTranslation();
    const last = useLastMoneyManagerImport(db);
    const undo = useAtomAction(
        undoMoneyManagerImportCommand,
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
                    { onPress: () => undo({ db }), style: "destructive", text: t("mmImport.undo.confirm") },
                ])
            }
            title={t("mmImport.undo.row")}
        />
    );
}
