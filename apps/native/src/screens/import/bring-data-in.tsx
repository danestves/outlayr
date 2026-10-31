import Notion01Icon from "@hugeicons-pro/core-stroke-rounded/Notion01Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { useRouter } from "expo-router";
import { useRef } from "react";
import { Linking } from "react-native";

import { CategoryIconTile } from "@/components/category-icon-tile";
import { ImportSheet } from "@/components/import-sheet/import-sheet";
import type { ImportSheetHandle } from "@/components/import-sheet/import-sheet";
import { SettingsSection } from "@/components/list/list-row";
import { SettingsScreen } from "@/components/settings/settings-screen";
import type { ImportSourceId } from "@/domain/import-sources";
import { useTranslation } from "@/i18n/context";
import { expectHandoff } from "@/lib/app-handoff";
import { importDraftStore } from "@/lib/import-draft-store";
import { supportMailURL } from "@/lib/support-link";
import { useColors } from "@/theme/use-colors";

import { ImportRow } from "./components/import-row";
import { SourceLogo } from "./components/parts";
import { useImportPaths } from "./paths";

function notionGlyph({ color, size }: { color: string; size: number }) {
    return <HugeiconsIcon color={color} icon={Notion01Icon} size={size} strokeWidth={1.9} />;
}

export function BringDataIn() {
    const router = useRouter();
    const t = useTranslation();
    const colors = useColors();
    const { paths } = useImportPaths();
    const csvSheet = useRef<ImportSheetHandle>(null);

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
                    detail={t("mmImport.sources.notionDetail")}
                    leading={<CategoryIconTile color={colors.foreground} glyph={notionGlyph} icon={null} size={32} />}
                    onPress={() => openFileImport("notion")}
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
        </SettingsScreen>
    );
}
