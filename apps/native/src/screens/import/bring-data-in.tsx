import { useAtomValue } from "@effect/atom-react/Hooks";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Linking } from "react-native";

import { CategoryIconTile } from "@/components/category-icon-tile";
import { ImportSheet } from "@/components/import-sheet/import-sheet";
import type { ImportSheetHandle } from "@/components/import-sheet/import-sheet";
import { SettingsSection } from "@/components/list/list-row";
import { SettingsScreen } from "@/components/settings/settings-screen";
import type { ImportFlowEvent } from "@/domain/import-flow";
import type { ImportSourceId } from "@/domain/import-sources";
import { useProEntitled } from "@/hooks/use-pro-locked";
import { useTranslation } from "@/i18n/context";
import { expectHandoff } from "@/lib/app-handoff";
import { useAuthSession } from "@/lib/auth-session";
import { importDraftStore } from "@/lib/import-draft-store";
import { supportMailURL } from "@/lib/support-link";
import { notionConnectionAtom } from "@/state/notion-commands";
import { useColors } from "@/theme/use-colors";

import { ImportRow } from "./components/import-row";
import { SourceLogo } from "./components/parts";
import { NotionSheet, notionWorkspace } from "./notion-sheet";
import type { NotionSheetHandle } from "./notion-sheet";
import { useImportPaths } from "./paths";

export function BringDataIn() {
    const router = useRouter();
    const t = useTranslation();
    const colors = useColors();
    const { paths } = useImportPaths();
    const csvSheet = useRef<ImportSheetHandle>(null);
    const notionSheet = useRef<NotionSheetHandle>(null);
    const { accountId, gate } = useAuthSession();
    const entitled = useProEntitled();
    const [attempt, setAttempt] = useState(0);
    const notion = useAtomValue(notionConnectionAtom({ accountId, attempt, entitled }));
    const workspace = notionWorkspace(notion);

    const openFileImport = (sourceId: ImportSourceId) => {
        if (importDraftStore.getSnapshot().flow.sourceId !== sourceId) {
            importDraftStore.clear();
        }
        const resume = importDraftStore.getResumeStep();
        if (resume === "source") {
            importDraftStore.dispatch({ sourceId, type: "sourceSelected" });
        }
        importDraftStore.setStep(resume === "source" ? "file" : resume);
        csvSheet.current?.present();
    };

    const importFromNotion = (event: ImportFlowEvent) => {
        importDraftStore.clear();
        importDraftStore.dispatch({ sourceId: "notion", type: "sourceSelected" });
        importDraftStore.dispatch(event);
        importDraftStore.setStep("file");
        csvSheet.current?.present();
    };

    const notionDetail = () => {
        if (workspace === null) {
            return t("mmImport.sources.notionDetail");
        }
        return workspace.name === null
            ? t("mmImport.notion.connected")
            : t("mmImport.notion.connectedTo", { workspace: workspace.name });
    };

    const askForApp = () => {
        expectHandoff();
        Linking.openURL(supportMailURL(t("mmImport.sources.requestSubject")));
    };

    return (
        <SettingsScreen>
            <SettingsSection title={t("mmImport.sources.apps")}>
                <ImportRow
                    detail={t("mmImport.sources.moneyManagerDetail")}
                    leading={<SourceLogo source="moneyManager" />}
                    onPress={() => router.push(paths.intro)}
                    testID="import-source-money-manager"
                    title={t("mmImport.nav.moneyManager")}
                />
                <ImportRow
                    detail={notionDetail()}
                    leading={<SourceLogo source="notion" />}
                    onPress={() => {
                        if (gate === "unconfigured") {
                            openFileImport("notion");
                            return;
                        }
                        setAttempt((count) => count + 1);
                        notionSheet.current?.present();
                    }}
                    testID="import-source-notion"
                    title={t("mmImport.sources.notion")}
                />
            </SettingsSection>
            <SettingsSection
                footer={t("mmImport.sources.footer")}
                footerLink={{ label: t("mmImport.sources.request"), onPress: askForApp }}
                title={t("mmImport.sources.file")}
            >
                <ImportRow
                    detail={t("mmImport.sources.csvDetail")}
                    leading={<CategoryIconTile color={colors.foreground} icon="Invoice03" size={32} type="solid" />}
                    onPress={() => openFileImport("csv")}
                    testID="import-source-csv"
                    title={t("mmImport.sources.csv")}
                />
            </SettingsSection>
            <ImportSheet ref={csvSheet} />
            <NotionSheet
                connection={notion}
                onImport={importFromNotion}
                onRefresh={() => setAttempt((count) => count + 1)}
                onUpload={() => openFileImport("notion")}
                ref={notionSheet}
            />
        </SettingsScreen>
    );
}
