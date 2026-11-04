import { useAtomValue } from "@effect/atom-react/Hooks";
import { noticeKey } from "@outlayr/backend/confect/legal";
import type { PolicyNotice } from "@outlayr/backend/confect/legal";
import { utcDateString } from "@outlayr/money/dates";
import * as Cause from "effect/Cause";
import { useSegments } from "expo-router";
import { BottomSheet } from "panelui-native/components/bottom-sheet";
import { Button } from "panelui-native/components/button";
import { cn } from "panelui-native/utils/cn";
import { useState } from "react";
import { View } from "react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";

import { useAppLockOpen } from "@/components/app-lock-gate";
import { useAuthCovered } from "@/components/auth-cover";
import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { useSheetInsets } from "@/components/use-sheet-insets";
import { useDatabase } from "@/contexts/local-data-context";
import { useNumberSetting } from "@/data/settings";
import { formatTargetDate } from "@/domain/dates";
import { pendingNotices } from "@/domain/policy-notice";
import { useLanguage, useTranslation } from "@/i18n/context";
import { languageSubtag } from "@/i18n/languages";
import type { Language } from "@/i18n/languages";
import { openInAppBrowser } from "@/lib/app-handoff";
import { legalUrl } from "@/lib/legal-url";
import { policyNoticesAtom } from "@/lib/policy-notices";
import { SILENT } from "@/state/atom-command";
import { setNumberSettingCommand } from "@/state/settings-commands";
import { useAtomAction } from "@/state/use-atom-action";
import { useColors } from "@/theme/use-colors";

const noticeLanguage = (language: Language) => {
    const subtag = languageSubtag(language);
    return subtag === "es" || subtag === "fr" || subtag === "pt" ? subtag : "en";
};

const pendingKey = (notices: readonly PolicyNotice[]) => notices.map(noticeKey).join(",");

export function PolicyNoticeSheet() {
    const t = useTranslation();
    const { language } = useLanguage();
    const colors = useColors();
    const sheetInsets = useSheetInsets();
    const db = useDatabase();
    const onTabs = useSegments()[0] === "(tabs)";
    const lockOpen = useAppLockOpen();
    const covered = useAuthCovered();
    const notices = useAtomValue(policyNoticesAtom);
    const privacySeen = useNumberSetting(db, "privacyNoticeSeen");
    const termsSeen = useNumberSetting(db, "termsNoticeSeen");
    const pending = pendingNotices(notices, { privacy: privacySeen, terms: termsSeen });
    const [shown, setShown] = useState(pending);
    if (pending.length > 0 && pendingKey(pending) !== pendingKey(shown)) {
        setShown(pending);
    }
    const setSeen = useAtomAction(
        setNumberSettingCommand,
        { onFailure: (cause) => console.error("Saving the policy notice failed", Cause.squash(cause)) },
        SILENT
    );

    const [only] = shown;
    if (!only) {
        return null;
    }

    const acknowledge = () => {
        for (const { document, effectiveAtMs } of shown) {
            setSeen({ db, key: `${document}NoticeSeen`, value: effectiveAtMs });
        }
    };
    const single = shown.length === 1;
    const documentName = (document: PolicyNotice["document"]) =>
        t(document === "privacy" ? "policyNotice.privacyName" : "policyNotice.termsName");
    const open = pending.length > 0 && onTabs && lockOpen && !covered;

    return (
        <BottomSheet
            native
            nativeBackground={colors.background}
            onOpenChange={(next) => {
                if (!next && open) {
                    acknowledge();
                }
            }}
            open={open}
        >
            <SafeAreaInsetsContext.Provider value={sheetInsets}>
                <BottomSheet.Content size="auto">
                    <View className="gap-1 pb-4">
                        <Text accessibilityRole="header" className="text-foreground font-sans-semibold text-title">
                            {single
                                ? t(only.document === "privacy" ? "policyNotice.privacy" : "policyNotice.terms")
                                : t("policyNotice.both")}
                        </Text>
                        <MonoLabel>
                            {t("policyNotice.meta", {
                                date: formatTargetDate(
                                    new Date(`${utcDateString(only.effectiveAtMs)}T12:00:00`),
                                    language
                                ),
                            })}
                        </MonoLabel>
                    </View>
                    {shown.map(({ changes: byLanguage, document }, section) => {
                        const changes = byLanguage[noticeLanguage(language)];
                        return (
                            <View className={cn(section > 0 && "pt-4")} key={document}>
                                {single ? null : (
                                    <MonoLabel accessibilityRole="header" className="pb-1.5">
                                        {documentName(document)}
                                    </MonoLabel>
                                )}
                                {changes.map((change, index) => (
                                    <View
                                        className={cn(
                                            "border-border border-t py-2.5",
                                            index === changes.length - 1 && "border-b"
                                        )}
                                        key={change.label}
                                    >
                                        <Text className="text-body text-foreground">{change.label}</Text>
                                        {change.detail ? (
                                            <Text className="text-footnote text-muted pt-0.5 leading-snug">
                                                {change.detail}
                                            </Text>
                                        ) : null}
                                    </View>
                                ))}
                            </View>
                        );
                    })}
                    <Text className="text-footnote text-muted pt-3 pb-5 leading-snug">{t("policyNotice.accept")}</Text>
                    <View className="flex-row gap-2.5">
                        {shown.map(({ document }) => (
                            <Button
                                className="flex-1 rounded-full"
                                key={document}
                                onPress={() => openInAppBrowser(legalUrl(document, language))}
                                size="md"
                                variant="primary"
                            >
                                {single ? t("policyNotice.read") : documentName(document)}
                            </Button>
                        ))}
                    </View>
                    <Button className="mt-2.5 rounded-full" fullWidth onPress={acknowledge} size="md" variant="ghost">
                        {t("policyNotice.ok")}
                    </Button>
                </BottomSheet.Content>
            </SafeAreaInsetsContext.Provider>
        </BottomSheet>
    );
}
