import { SettingsSection, ToggleRow } from "@/components/list/list-row";
import { SettingsScreen } from "@/components/settings/settings-screen";
import { useAppSettings, useDisplaySettings } from "@/contexts/display-settings-context";
import { useDatabase } from "@/contexts/local-data-context";
import { useTranslation } from "@/i18n/context";
import { setBoolSettingCommand } from "@/state/settings-commands";
import { useAtomAction } from "@/state/use-atom-action";

export function FeatureLab() {
    const db = useDatabase();
    const setBoolSetting = useAtomAction(setBoolSettingCommand);
    const t = useTranslation();
    const { state: settings } = useAppSettings();
    const { swapTimeLabel } = useDisplaySettings().state;
    const confetti = settings.bool("confetti");
    const lineGraph = settings.bool("logViewLineGraph");
    const budgetRows = settings.bool("budgetViewStyle");
    const aiEnrichment = settings.bool("aiEnrichment");
    const groundedLookup = settings.bool("groundedLookup");

    return (
        <SettingsScreen>
            <SettingsSection
                footer={`${t("settings.featureLab.aiEnrichmentNote")}\n\n${t("settings.featureLab.groundedLookupNote")}\n\n${t("settings.featureLab.aiProvidersNote")}`}
                title={t("settings.featureLab.aiSection")}
            >
                <ToggleRow
                    icon="Sparkles"
                    onValueChange={(next) => {
                        setBoolSetting({ db, key: "aiEnrichment", value: next });
                    }}
                    title={t("settings.featureLab.aiEnrichment")}
                    value={aiEnrichment}
                />
                <ToggleRow
                    icon="Sparkles"
                    onValueChange={(next) => {
                        setBoolSetting({ db, key: "groundedLookup", value: next });
                    }}
                    title={t("settings.featureLab.groundedLookup")}
                    value={groundedLookup}
                />
            </SettingsSection>

            <SettingsSection
                footer={t("settings.featureLab.confettiNote")}
                title={t("settings.featureLab.addingSection")}
            >
                <ToggleRow
                    icon="Sparkles"
                    onValueChange={(next) => {
                        setBoolSetting({ db, key: "confetti", value: next });
                    }}
                    title={t("settings.featureLab.confetti")}
                    value={confetti}
                />
            </SettingsSection>

            <SettingsSection footer={t("settings.featureLab.experimental")} title={t("settings.featureLab.logSection")}>
                <ToggleRow
                    icon="ChartLineData01"
                    onValueChange={(next) => {
                        setBoolSetting({ db, key: "logViewLineGraph", value: next });
                    }}
                    title={t("settings.featureLab.lineGraph")}
                    value={lineGraph}
                />
            </SettingsSection>

            <SettingsSection
                footer={t("settings.featureLab.budgetRowsNote")}
                title={t("settings.featureLab.budgetsSection")}
            >
                <ToggleRow
                    icon="LayoutTable01"
                    onValueChange={(next) => {
                        setBoolSetting({ db, key: "budgetViewStyle", value: next });
                    }}
                    title={t("settings.featureLab.budgetRows")}
                    value={budgetRows}
                />
            </SettingsSection>

            <SettingsSection
                footer={t("settings.featureLab.swapTimeNote")}
                title={t("settings.featureLab.transactionRowsSection")}
            >
                <ToggleRow
                    icon="TextFont"
                    onValueChange={(next) => {
                        setBoolSetting({ db, key: "swapTimeLabel", value: next });
                    }}
                    title={t("settings.featureLab.swapTime")}
                    value={swapTimeLabel}
                />
            </SettingsSection>
        </SettingsScreen>
    );
}
