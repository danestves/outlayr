import { useAtomValue } from "@effect/atom-react/Hooks";
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
import { pendingNotice } from "@/domain/policy-notice";
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

export function PolicyNoticeSheet() {
    const t = useTranslation();
    const { language } = useLanguage();
    const colors = useColors();
    const sheetInsets = useSheetInsets();
    const db = useDatabase();
    const onTabs = useSegments()[0] === "(tabs)";
    const lockOpen = useAppLockOpen();
    const covered = useAuthCovered();
    const notice = pendingNotice(useAtomValue(policyNoticesAtom), {
        privacy: useNumberSetting(db, "privacyNoticeSeen"),
        terms: useNumberSetting(db, "termsNoticeSeen"),
    });
    const [shown, setShown] = useState(notice);
    if (notice && notice !== shown) {
        setShown(notice);
    }
    const setSeen = useAtomAction(
        setNumberSettingCommand,
        { onFailure: (cause) => console.error("Saving the policy notice failed", Cause.squash(cause)) },
        SILENT
    );

    if (!shown) {
        return null;
    }

    const acknowledge = () => setSeen({ db, key: `${shown.document}NoticeSeen`, value: shown.effectiveAtMs });
    const changes = shown.changes[noticeLanguage(language)];
    const open = notice !== null && onTabs && lockOpen && !covered;

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
                            {t(shown.document === "privacy" ? "policyNotice.privacy" : "policyNotice.terms")}
                        </Text>
                        <MonoLabel>
                            {t("policyNotice.meta", {
                                date: formatTargetDate(
                                    new Date(`${utcDateString(shown.effectiveAtMs)}T12:00:00`),
                                    language
                                ),
                            })}
                        </MonoLabel>
                    </View>
                    <View>
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
                    <Text className="text-footnote text-muted pt-3 pb-5 leading-snug">{t("policyNotice.accept")}</Text>
                    <Button
                        className="rounded-full"
                        fullWidth
                        onPress={() => openInAppBrowser(legalUrl(shown.document, language))}
                        size="md"
                        variant="primary"
                    >
                        {t("policyNotice.read")}
                    </Button>
                    <Button className="mt-2.5 rounded-full" fullWidth onPress={acknowledge} size="md" variant="ghost">
                        {t("policyNotice.ok")}
                    </Button>
                </BottomSheet.Content>
            </SafeAreaInsetsContext.Provider>
        </BottomSheet>
    );
}
