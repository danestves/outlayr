import Constants from "expo-constants";
import { useRouter } from "expo-router";
import type { Href } from "expo-router";
import { useRef, useState } from "react";
import { Linking, Platform } from "react-native";

import { ImportSheet } from "@/components/import-sheet/import-sheet";
import type { ImportSheetHandle } from "@/components/import-sheet/import-sheet";
import { LinkRow, PickerRow, SettingsSection, ToggleRow } from "@/components/list/list-row";
import { AccountRow } from "@/components/settings/account-row";
import type { SettingsIconName } from "@/components/settings/settings-icons";
import { SettingsScreen } from "@/components/settings/settings-screen";
import { UsageRow } from "@/components/settings/usage-row";
import { useAppSettings, useDisplaySettings } from "@/contexts/display-settings-context";
import { useDatabase } from "@/contexts/local-data-context";
import { useRevenueCat } from "@/contexts/revenuecat-context";
import { useGlobalCurrency } from "@/data/app-meta";
import {
    HAPTICS_OPTIONS,
    NUMBER_ENTRY_OPTIONS,
    onOffLabel,
    saveAiConsent,
    setBoolSetting,
    setNumberSetting,
    shownHiddenLabel,
} from "@/data/settings-core";
import { useSyncStatus } from "@/data/use-sync-status";
import { useValuationCoverage } from "@/data/use-valuation-coverage";
import type { Database } from "@/db/client";
import { ACCENT_OPTIONS, DEFAULT_ACCENT_VALUE } from "@/domain/accent-options";
import { appIconLabel } from "@/domain/app-icons";
import { lockFailureMessage } from "@/domain/app-lock";
import { offeredAccentValue } from "@/domain/material-accent";
import { syncPaused, syncStatusLabel } from "@/domain/sync-status";
import { coverageNote } from "@/domain/valuation-coverage";
import { useProEntitled } from "@/hooks/use-pro-locked";
import type { TranslationKey } from "@/i18n/catalog";
import { useLanguage, useTranslation } from "@/i18n/context";
import { languageLabel } from "@/i18n/languages";
import { translateNow } from "@/i18n/runtime";
import { expectHandoff, openInAppBrowser } from "@/lib/app-handoff";
import { alternateIconsSupported, useAppIcon } from "@/lib/app-icon";
import { requestUnlock } from "@/lib/app-lock";
import { APP_BUILD, APP_VERSION } from "@/lib/app-version";
import { useAuthSession } from "@/lib/auth-session";
import { importDraftStore } from "@/lib/import-draft-store";
import { hasSystemLanguageSettings, openLanguageSettings } from "@/lib/language-settings";
import { legalUrl } from "@/lib/legal-url";
import { notifyFailure } from "@/lib/notify";
import { supportMailto } from "@/lib/support-mailto";
import type { SupportDiagnostics } from "@/lib/support-mailto";
import { THEME_OPTIONS } from "@/theme/theme-preference";
import { useIsDark } from "@/theme/use-is-dark";

const SUPPORT_EMAIL = "support@tryoutlayr.com";

const DATA_LINKS = [
    { href: "/settings/export", icon: "FileExport", title: "settings.row.export" },
    { href: "/settings/restore", icon: "ArchiveRestore", title: "settings.row.restore" },
    { href: "/settings/deleted", icon: "Clock04", title: "settings.row.deleted" },
    { destructive: true, href: "/settings/erase", icon: "Delete02", title: "settings.row.erase" },
] satisfies readonly { destructive?: boolean; href: Href; icon: SettingsIconName; title: TranslationKey }[];

async function toggleAppLock(db: Database, next: boolean): Promise<void> {
    const result = await requestUnlock(translateNow(next ? "settings.lock.promptOn" : "settings.lock.promptOff"));
    if (result.success) {
        await setBoolSetting(db, "biometricLock", next);
        return;
    }
    const messageKey = lockFailureMessage(result.error);
    if (messageKey) {
        notifyFailure({
            body: translateNow(messageKey),
            title: translateNow("settings.lock.alertTitle"),
        });
    }
}

export function Settings() {
    const db = useDatabase();
    const router = useRouter();
    const t = useTranslation();
    const { isPro } = useRevenueCat();
    const importSheetRef = useRef<ImportSheetHandle>(null);
    const [lockPending, setLockPending] = useState<boolean | null>(null);
    const { language } = useLanguage();
    const { accountId } = useAuthSession();

    const currency = useGlobalCurrency(db);
    const coverage = useValuationCoverage(db);
    const sync = useSyncStatus(db);
    const proEntitled = useProEntitled();
    const { state: settings } = useAppSettings();
    const { showCents } = useDisplaySettings().state;
    const showNotifications = settings.bool("showNotifications");
    const biometricLock = settings.bool("biometricLock");
    const shareAnalytics = settings.bool("shareAnalytics");
    const aiConsent = settings.bool("aiConsentV2");
    const incomeTracking = settings.bool("incomeTracking");
    const showUpcoming = settings.bool("showUpcoming");
    const animatedCharts = settings.bool("animatedCharts");
    const numberEntryType = settings.number("numberEntryType");
    const haptics = settings.number("haptics");
    const accentColor = settings.number("accentColor");
    const colorScheme = settings.number("colorScheme");
    const scheme = useIsDark() ? "dark" : "light";

    const diagnostics = supportDiagnostics(APP_VERSION, APP_BUILD);

    const syncLabel = syncStatusLabel({
        enabled: sync.enabled,
        paused: syncPaused(sync.enabled, proEntitled),
        pending: sync.pending,
        syncedAt: sync.syncedAt,
    });
    const syncValue = syncLabel.count === undefined ? t(syncLabel.key) : t(syncLabel.key, { count: syncLabel.count });

    return (
        <SettingsScreen footer={`Outlayr ${APP_VERSION} (${APP_BUILD})`}>
            <SettingsSection title={t("settings.section.account")}>
                <AccountRow />
                <LinkRow
                    icon="Sparkles"
                    onPress={() => router.push("/paywall")}
                    title={t("pro.entry.title")}
                    value={isPro ? t("pro.entry.valuePro") : t("pro.entry.value")}
                />
                <UsageRow />
                {accountId === null ? null : (
                    <LinkRow
                        icon="Cloud"
                        onPress={() => router.push("/settings/sync")}
                        title={t("settings.row.sync")}
                        value={syncValue}
                    />
                )}
            </SettingsSection>

            <SettingsSection footer={coverageNote(coverage, t) ?? undefined} title={t("settings.section.money")}>
                <LinkRow
                    icon="Currency"
                    onPress={() => router.push("/settings/currency")}
                    title={t("settings.row.currency")}
                    value={currency}
                />
                <PickerRow
                    icon="Calculator01"
                    onChange={(next) => {
                        setNumberSetting(db, "numberEntryType", next);
                    }}
                    options={NUMBER_ENTRY_OPTIONS.map((option) => ({
                        label: t(option.label),
                        value: option.value,
                    }))}
                    title={t("settings.row.numberEntry")}
                    value={numberEntryType}
                />
                <ToggleRow
                    icon="MoneyAdd01"
                    onValueChange={(next) => {
                        setBoolSetting(db, "incomeTracking", next);
                    }}
                    title={t("settings.row.incomeTracking")}
                    value={incomeTracking}
                />
                <ToggleRow
                    icon="BadgeCent"
                    onValueChange={(next) => {
                        setBoolSetting(db, "showCents", next);
                    }}
                    testID="toggle-display-cents"
                    title={t("settings.row.displayCents")}
                    value={showCents}
                />
            </SettingsSection>

            <SettingsSection title={t("settings.section.appearance")}>
                <PickerRow
                    icon="DarkMode"
                    onChange={(next) => {
                        setNumberSetting(db, "colorScheme", next);
                    }}
                    options={THEME_OPTIONS.map((option) => ({
                        label: t(option.label),
                        value: option.value,
                    }))}
                    title={t("settings.row.colorScheme")}
                    value={colorScheme}
                />
                <PickerRow
                    icon="Swatch"
                    onChange={(next) => {
                        setNumberSetting(db, "accentColor", next);
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
                        icon="LanguageSkill"
                        onPress={() => {
                            expectHandoff();
                            openLanguageSettings();
                        }}
                        title={t("settings.row.language")}
                        value={languageLabel(language)}
                    />
                ) : null}
                <ToggleRow
                    icon="Analytics01"
                    onValueChange={(next) => {
                        setBoolSetting(db, "animatedCharts", next);
                    }}
                    title={t("settings.row.animatedCharts")}
                    value={animatedCharts}
                />
            </SettingsSection>

            <SettingsSection title={t("settings.section.ledger")}>
                <LinkRow icon="Bank" onPress={() => router.push("/accounts")} title={t("settings.row.accounts")} />
                <LinkRow
                    icon="DashboardSquare01"
                    onPress={() => router.push("/settings/categories")}
                    title={t("settings.row.categories")}
                />
                <LinkRow
                    icon="Sunrise"
                    onPress={() => router.push("/settings/upcoming")}
                    title={t("settings.row.upcoming")}
                    value={t(shownHiddenLabel(showUpcoming))}
                />
                <LinkRow
                    icon="Calendar01"
                    onPress={() => router.push("/settings/time")}
                    title={t("settings.row.timeFrames")}
                />
            </SettingsSection>

            <SettingsSection title={t("settings.section.device")}>
                <LinkRow
                    icon="Wallet01"
                    onPress={() => router.push("/settings/wallet")}
                    title={t(Platform.OS === "ios" ? "settings.row.wallet" : "settings.row.autoLog")}
                />
                <LinkRow
                    icon="Notification03"
                    onPress={() => router.push("/settings/notifications")}
                    title={t("settings.row.notifications")}
                    value={t(onOffLabel(showNotifications))}
                />
                <ToggleRow
                    icon="BiometricAccess"
                    onValueChange={async (next) => {
                        setLockPending(next);
                        await toggleAppLock(db, next).finally(() => setLockPending(null));
                    }}
                    title={t("settings.row.authentication")}
                    value={lockPending ?? biometricLock}
                />
                <ToggleRow
                    icon="ChartBarLine"
                    onValueChange={(next) => {
                        setBoolSetting(db, "shareAnalytics", next);
                    }}
                    title={t("settings.row.shareAnalytics")}
                    value={shareAnalytics}
                />
                <ToggleRow
                    icon="Sparkles"
                    onValueChange={(next) => {
                        if (next) {
                            setBoolSetting(db, "aiConsentV2", true);
                        } else {
                            saveAiConsent(db, false);
                        }
                    }}
                    title={t("settings.row.sendToAi")}
                    value={aiConsent}
                />
                <PickerRow
                    icon="Tap01"
                    onChange={(next) => {
                        setNumberSetting(db, "haptics", next);
                    }}
                    options={HAPTICS_OPTIONS.map((option) => ({
                        label: t(option.label),
                        value: option.value,
                    }))}
                    title={t("settings.row.haptics")}
                    value={haptics}
                />
                <LinkRow
                    icon="TestTube"
                    onPress={() => router.push("/settings/feature-lab")}
                    title={t("settings.row.featureLab")}
                />
            </SettingsSection>

            <SettingsSection title={t("settings.section.data")}>
                <LinkRow
                    icon="FileImport"
                    onPress={() => {
                        importDraftStore.setStep(importDraftStore.getResumeStep());
                        importSheetRef.current?.present();
                    }}
                    title={t("settings.row.import")}
                />
                {DATA_LINKS.map((row) => (
                    <LinkRow
                        destructive={"destructive" in row}
                        icon={row.icon}
                        key={row.href}
                        onPress={() => router.push(row.href)}
                        title={t(row.title)}
                    />
                ))}
            </SettingsSection>

            <SettingsSection title={t("settings.section.about")}>
                <LinkRow
                    icon="Mail01"
                    onPress={() => {
                        expectHandoff();
                        Linking.openURL(supportMailto(SUPPORT_EMAIL, t("settings.support.subject"), diagnostics));
                    }}
                    title={t("settings.row.contactSupport")}
                />
                <LinkRow
                    icon="SecurityCheck"
                    onPress={() => openInAppBrowser(legalUrl("privacy", language))}
                    title={t("settings.row.privacy")}
                />
                <LinkRow
                    icon="LegalDocument01"
                    onPress={() => openInAppBrowser(legalUrl("terms", language))}
                    title={t("settings.row.terms")}
                />
                <LinkRow
                    icon="InformationCircle"
                    onPress={() => router.push("/settings/about")}
                    title={t("settings.row.about")}
                />
            </SettingsSection>
            <ImportSheet ref={importSheetRef} />
        </SettingsScreen>
    );
}

function AppIconRow() {
    const router = useRouter();
    const t = useTranslation();
    const { active } = useAppIcon();
    return (
        <LinkRow
            icon="SmartPhone01"
            onPress={() => router.push("/settings/app-icon")}
            title={t("settings.row.appIcon")}
            value={t(appIconLabel(active))}
        />
    );
}

function supportDiagnostics(version: string, build: string): SupportDiagnostics {
    return {
        appBuild: build,
        appName: Constants.expoConfig?.name ?? "Outlayr",
        appVersion: version,
        deviceName: Constants.deviceName ?? "",
        osName: Platform.select({ android: "Android", ios: "iOS" }) ?? Platform.OS,
        osVersion: String(Platform.Version),
    };
}
