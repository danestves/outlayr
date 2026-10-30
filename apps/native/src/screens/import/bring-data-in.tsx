import { useRouter } from "expo-router";
import { useRef } from "react";
import { Linking } from "react-native";

import { CategoryIconTile } from "@/components/category-icon-tile";
import { ImportRow } from "@/components/import-flow/import-row";
import { SourceLogo } from "@/components/import-flow/parts";
import { ImportSheet } from "@/components/import-sheet/import-sheet";
import type { ImportSheetHandle } from "@/components/import-sheet/import-sheet";
import { SettingsSection } from "@/components/list/list-row";
import { SettingsScreen } from "@/components/settings/settings-screen";
import { useTranslation } from "@/i18n/context";
import { expectHandoff } from "@/lib/app-handoff";
import { importDraftStore } from "@/lib/import-draft-store";
import { supportMailURL } from "@/lib/support-link";
import { useColors } from "@/theme/use-colors";

import { useImportPaths } from "./paths";

export function BringDataIn() {
    const router = useRouter();
    const t = useTranslation();
    const colors = useColors();
    const { paths } = useImportPaths();
    const csvSheet = useRef<ImportSheetHandle>(null);

    const openCsv = () => {
        const resume = importDraftStore.getResumeStep();
        if (resume === "source") {
            importDraftStore.dispatch({ sourceId: "csv", type: "sourceSelected" });
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
            </SettingsSection>
            <SettingsSection
                footer={t("mmImport.sources.footer")}
                footerLink={{ label: t("mmImport.sources.request"), onPress: askForApp }}
                title={t("mmImport.sources.file")}
            >
                <ImportRow
                    detail={t("mmImport.sources.csvDetail")}
                    leading={<CategoryIconTile color={colors.foreground} icon="Invoice03" size={32} type="solid" />}
                    onPress={openCsv}
                    testID="import-source-csv"
                    title={t("mmImport.sources.csv")}
                />
            </SettingsSection>
            <ImportSheet ref={csvSheet} />
        </SettingsScreen>
    );
}
