import { useRouter } from "expo-router";
import { useState } from "react";
import { Linking, Platform, View } from "react-native";

import { AiConsentPromptSheet } from "@/components/ai-consent";
import { UndoImportRow } from "@/components/import-flow/undo-import-row";
import { LinkRow, SettingsSection, ToggleRow } from "@/components/list/list-row";
import { AccentSwatches } from "@/components/settings/accent-swatches";
import { AccountPanel } from "@/components/settings/account-panel";
import { DataActions } from "@/components/settings/data-actions";
import { SegmentedRow } from "@/components/settings/segmented-row";
import { SettingsFooterLinks } from "@/components/settings/settings-footer-links";
import type { SettingsIconName } from "@/components/settings/settings-icons";
import { SettingsScreen } from "@/components/settings/settings-screen";
import { ThemePicker } from "@/components/settings/theme-picker";
import { Text } from "@/components/text";
import { useAppSettings, useDisplaySettings } from "@/contexts/display-settings-context";
import { useDatabase } from "@/contexts/local-data-context";
import { useBankAccounts } from "@/data/accounts";
import { useGlobalCurrency } from "@/data/app-meta";
import {
    HAPTICS_OPTIONS,
    NUMBER_ENTRY_OPTIONS,
    onOffLabel,
    remoteEnrichmentOn,
    shownHiddenLabel,
    WEEKDAY_OPTIONS,
} from "@/data/settings-core";
import { useCategoryCount, useDeletedCount } from "@/data/settings-counts";
import { useValuationCoverage } from "@/data/use-valuation-coverage";
import { ACCENT_OPTIONS, DEFAULT_ACCENT_VALUE } from "@/domain/accent-options";
import { appIconLabel } from "@/domain/app-icons";
import { BALANCES_ACCOUNTS } from "@/domain/balances";
import { offeredAccentValue } from "@/domain/material-accent";
import { formatAmount, minorUnitsFor } from "@/domain/money";
import { coverageNote } from "@/domain/valuation-coverage";
import { useLanguage, useTranslation } from "@/i18n/context";
import { languageLabel } from "@/i18n/languages";
import { translateNow } from "@/i18n/runtime";
import { expectHandoff, openInAppBrowser } from "@/lib/app-handoff";
import { alternateIconsSupported, useAppIcon } from "@/lib/app-icon";
import { APP_BUILD, APP_VERSION } from "@/lib/app-version";
import { hasSystemLanguageSettings } from "@/lib/language-settings";
import { legalUrl } from "@/lib/legal-url";
import { notifyFailure } from "@/lib/notify";
import { SUPPORT_EMAIL, supportDiagnostics } from "@/lib/support-link";
import { supportMailto } from "@/lib/support-mailto";
import { SILENT } from "@/state/atom-command";
import { appAtomRegistry } from "@/state/atom-registry";
import { openLanguageSettingsCommand } from "@/state/link-commands";
import { saveAiConsentCommand, setBoolSettingCommand, setNumberSettingCommand } from "@/state/settings-commands";
import { toggleAppLockCommand } from "@/state/settings-flow-commands";
import { fireAtomCommand, useAtomAction } from "@/state/use-atom-action";
import { THEME_DISPLAY_OPTIONS } from "@/theme/theme-preference";
import { useIsDark } from "@/theme/use-is-dark";

import { useIntegrationsOn } from "./integrations-on";

const SAMPLE_AMOUNT = 1284.5;
// Matches the 1284 the `settings.numberEntry.type1Note` copy says to type.
const CENTS_LAST_KEYS = 1284;
const BIOMETRIC_ICON: SettingsIconName = Platform.OS === "android" ? "FingerprintPattern" : "ScanFace";
const HAPTICS_ICON: SettingsIconName = Platform.OS === "android" ? "Vibrate" : "Hand";

export function Settings() {
    const db = useDatabase();
    const setBool = useAtomAction(setBoolSettingCommand);
    const setNumber = useAtomAction(setNumberSettingCommand);
    const saveAiConsent = useAtomAction(saveAiConsentCommand);
    const router = useRouter();
    const t = useTranslation();
    const [lockPending, setLockPending] = useState<boolean | null>(null);
    const [consentFor, setConsentFor] = useState<"smartFill" | "sendToAi" | null>(null);
    const toggleAppLock = useAtomAction(toggleAppLockCommand, {
        onSettled: () => setLockPending(null),
        onSuccess: (messageKey) => {
            if (messageKey) {
                notifyFailure({
                    body: translateNow(messageKey),
                    title: translateNow("settings.lock.alertTitle"),
                });
            }
        },
    });
    const { language } = useLanguage();

    const currency = useGlobalCurrency(db);
    const accountCount = useBankAccounts(db).length;
    const categoryCount = useCategoryCount(db);
    const deletedCount = useDeletedCount(db);
    const coverage = useValuationCoverage(db);
    const integrationsOn = useIntegrationsOn(db);
    const { state: settings } = useAppSettings();
    const { showCents } = useDisplaySettings().state;
    const showNotifications = settings.bool("showNotifications");
    const biometricLock = settings.bool("biometricLock");
    const shareAnalytics = settings.bool("shareAnalytics");
    const aiConsent = settings.bool("aiConsentV2");
    const smartFill = remoteEnrichmentOn(settings.bool);
    const incomeTracking = settings.bool("incomeTracking");
    const showUpcoming = settings.bool("showUpcoming");
    const animatedCharts = settings.bool("animatedCharts");
    const numberEntryType = settings.number("numberEntryType");
    const haptics = settings.number("haptics");
    const accentColor = settings.number("accentColor");
    const firstWeekday = settings.number("firstWeekday");
    const weekdayOption = WEEKDAY_OPTIONS.find((option) => option.value === firstWeekday);
    const colorScheme = settings.number("colorScheme");
    const scheme = useIsDark() ? "dark" : "light";

    const diagnostics = supportDiagnostics(APP_VERSION, APP_BUILD);
    const previewAmount = formatAmount(SAMPLE_AMOUNT, currency, showCents, language);
    const centsLastAmount = formatAmount(CENTS_LAST_KEYS / 10 ** minorUnitsFor(currency), currency, true, language);

    return (
        <SettingsScreen>
            <AccountPanel />

            <SettingsSection
                accessory={
                    <View className="flex-row items-baseline gap-2">
                        <Text className="text-muted text-subtitle">{t("settings.controls.preview")}</Text>
                        <Text className="text-foreground text-callout font-mono-medium tabular-nums">
                            {previewAmount}
                        </Text>
                    </View>
                }
                footer={coverageNote(coverage, t) ?? undefined}
                title={t("settings.section.money")}
            >
                <LinkRow
                    icon="Coins01"
                    onPress={() => router.push("/settings/currency")}
                    title={t("settings.row.currency")}
                    value={currency}
                />
                <SegmentedRow
                    icon="Calculator01"
                    onChange={(next) => {
                        setNumber({ db, key: "numberEntryType", value: next });
                    }}
                    options={NUMBER_ENTRY_OPTIONS.map((option) => ({
                        label: t(option.label),
                        note: t(option.note, { amount: centsLastAmount }),
                        value: option.value,
                    }))}
                    title={t("settings.row.numberEntry")}
                    value={numberEntryType}
                />
                <ToggleRow
                    icon="Banknote"
                    onValueChange={(next) => {
                        setBool({ db, key: "incomeTracking", value: next });
                    }}
                    title={t("settings.row.incomeTracking")}
                    value={incomeTracking}
                />
                <ToggleRow
                    icon="BadgeCent"
                    onValueChange={(next) => {
                        setBool({ db, key: "showCents", value: next });
                    }}
                    testID="toggle-display-cents"
                    title={t("settings.row.displayCents")}
                    value={showCents}
                />
            </SettingsSection>

            <SettingsSection title={t("settings.section.appearance")}>
                <ThemePicker
                    onChange={(next) => {
                        setNumber({ db, key: "colorScheme", value: next });
                    }}
                    options={THEME_DISPLAY_OPTIONS.map((option) => ({
                        label: t(option.label),
                        value: option.value,
                    }))}
                    value={colorScheme}
                />
                <AccentSwatches
                    icon="SwatchBook"
                    onChange={(next) => {
                        setNumber({ db, key: "accentColor", value: next });
                    }}
                    options={ACCENT_OPTIONS.map((accent) => ({
                        label: t(accent.label),
                        swatch: accent[scheme],
                        value: accent.value,
                    }))}
                    title={t("settings.row.theme")}
                    value={offeredAccentValue(accentColor, ACCENT_OPTIONS, DEFAULT_ACCENT_VALUE)}
                />
                {alternateIconsSupported ? <AppIconRow /> : null}
                {hasSystemLanguageSettings() ? (
                    <LinkRow
                        external
                        icon="Languages"
                        onPress={() => {
                            expectHandoff();
                            fireAtomCommand(appAtomRegistry, openLanguageSettingsCommand, undefined, {}, SILENT);
                        }}
                        title={t("settings.row.language")}
                        value={languageLabel(language)}
                    />
                ) : null}
                <ToggleRow
                    icon="ChartLine"
                    onValueChange={(next) => {
                        setBool({ db, key: "animatedCharts", value: next });
                    }}
                    title={t("settings.row.animatedCharts")}
                    value={animatedCharts}
                />
            </SettingsSection>

            <SettingsSection
                footer={t("settings.smartFill.note")}
                footerLink={{
                    label: t("settings.smartFill.learnMore"),
                    onPress: () => openInAppBrowser(legalUrl("privacy", language, "smartFill")),
                }}
                title={t("settings.section.ledger")}
            >
                <LinkRow
                    icon="Landmark"
                    onPress={() => router.navigate(BALANCES_ACCOUNTS)}
                    title={t("settings.row.accounts")}
                    value={String(accountCount)}
                />
                <LinkRow
                    icon="DashboardSquare01"
                    onPress={() => router.push("/settings/categories")}
                    title={t("settings.row.categories")}
                    value={String(categoryCount)}
                />
                <LinkRow
                    icon="Calendar01"
                    onPress={() => router.push("/settings/time")}
                    title={t("settings.row.timeFrames")}
                    value={weekdayOption ? t(weekdayOption.label) : undefined}
                />
                <LinkRow
                    icon="Sunrise"
                    onPress={() => router.push("/settings/upcoming")}
                    title={t("settings.row.upcoming")}
                    value={t(shownHiddenLabel(showUpcoming))}
                />
                <LinkRow
                    icon="Plug"
                    onPress={() => router.push("/settings/integrations")}
                    title={t("settings.row.integrations")}
                    value={
                        integrationsOn > 0
                            ? t("settings.integrations.onCount", { count: integrationsOn })
                            : t(onOffLabel(false))
                    }
                />
                <ToggleRow
                    icon="WandSparkles"
                    onValueChange={(next) => {
                        if (next && !aiConsent) {
                            setConsentFor("smartFill");
                            return;
                        }
                        setBool({ db, key: "aiEnrichment", value: next });
                        setBool({ db, key: "groundedLookup", value: next });
                    }}
                    title={t("settings.smartFill.title")}
                    value={smartFill || consentFor === "smartFill"}
                />
            </SettingsSection>

            <SettingsSection title={t("settings.section.privacy")}>
                <ToggleRow
                    icon={BIOMETRIC_ICON}
                    onValueChange={(next) => {
                        setLockPending(next);
                        toggleAppLock({
                            db,
                            next,
                            promptMessage: translateNow(next ? "settings.lock.promptOn" : "settings.lock.promptOff"),
                        });
                    }}
                    title={t("settings.row.authentication")}
                    value={lockPending ?? biometricLock}
                />
                <ToggleRow
                    icon="ChartBarIncreasing"
                    onValueChange={(next) => {
                        setBool({ db, key: "shareAnalytics", value: next });
                    }}
                    title={t("settings.row.shareAnalytics")}
                    value={shareAnalytics}
                />
                <ToggleRow
                    icon="Sparkles"
                    onValueChange={(next) => {
                        if (next) {
                            setConsentFor("sendToAi");
                        } else {
                            saveAiConsent({ allowed: false, db });
                        }
                    }}
                    title={t("settings.row.sendToAi")}
                    value={aiConsent || consentFor === "sendToAi"}
                />
            </SettingsSection>

            <SettingsSection title={t("settings.section.general")}>
                <LinkRow
                    icon="Bell"
                    onPress={() => router.push("/settings/notifications")}
                    title={t("settings.row.notifications")}
                    value={t(onOffLabel(showNotifications))}
                />
                <SegmentedRow
                    icon={HAPTICS_ICON}
                    onChange={(next) => {
                        setNumber({ db, key: "haptics", value: next });
                    }}
                    options={HAPTICS_OPTIONS.map((option) => ({
                        label: t(option.label),
                        note: t(option.note),
                        value: option.value,
                    }))}
                    title={t("settings.row.haptics")}
                    value={haptics}
                />
                <LinkRow
                    icon="FlaskConical"
                    onPress={() => router.push("/settings/feature-lab")}
                    title={t("settings.row.featureLab")}
                />
                <LinkRow
                    icon="Lightbulb"
                    onPress={() => router.push("/settings/suggest")}
                    title={t("settings.row.suggest")}
                />
                <LinkRow
                    icon="Lifebuoy"
                    onPress={() => {
                        expectHandoff();
                        Linking.openURL(supportMailto(SUPPORT_EMAIL, t("settings.support.subject"), diagnostics));
                    }}
                    title={t("settings.row.contactSupport")}
                />
            </SettingsSection>

            <SettingsSection title={t("settings.section.data")}>
                <DataActions
                    onExport={() => router.push("/settings/export")}
                    onImport={() => router.push("/import")}
                    onRestore={() => router.push("/settings/restore")}
                />
                <UndoImportRow />
                <LinkRow
                    icon="History"
                    onPress={() => router.push("/settings/deleted")}
                    title={t("settings.row.deleted")}
                    value={deletedCount > 0 ? String(deletedCount) : undefined}
                />
                <LinkRow
                    destructive
                    icon="Trash"
                    noChevron
                    onPress={() => router.push("/settings/erase")}
                    title={t("settings.row.erase")}
                />
            </SettingsSection>

            <SettingsFooterLinks
                onCredits={() => router.push("/settings/about")}
                onPrivacy={() => openInAppBrowser(legalUrl("privacy", language))}
                onTerms={() => openInAppBrowser(legalUrl("terms", language))}
                version={`Outlayr ${APP_VERSION} (${APP_BUILD})`}
            />
            <AiConsentPromptSheet
                onAnswer={(allowed) => {
                    if (allowed) {
                        saveAiConsent({ allowed, db });
                        if (consentFor === "smartFill") {
                            setBool({ db, key: "aiEnrichment", value: true });
                            setBool({ db, key: "groundedLookup", value: true });
                        }
                    }
                    setConsentFor(null);
                }}
                open={consentFor !== null}
            />
        </SettingsScreen>
    );
}

function AppIconRow() {
    const router = useRouter();
    const t = useTranslation();
    const { active } = useAppIcon();
    return (
        <LinkRow
            icon="Smartphone"
            onPress={() => router.push("/settings/app-icon")}
            title={t("settings.row.appIcon")}
            value={t(appIconLabel(active))}
        />
    );
}
