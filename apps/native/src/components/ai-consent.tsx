import { useRouter, useSegments } from "expo-router";
import { BottomSheet } from "panelui-native/components/bottom-sheet";
import { Button } from "panelui-native/components/button";
import { cn } from "panelui-native/utils/cn";
import { useMemo, useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaInsetsContext, useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppLockOpen } from "@/components/app-lock-gate";
import { useAuthCovered } from "@/components/auth-cover";
import { Text } from "@/components/text";
import { useDatabase } from "@/contexts/local-data-context";
import { useAiConsent } from "@/data/settings";
import { saveAiConsent } from "@/data/settings-core";
import type { AiConsent } from "@/data/settings-core";
import type { Database } from "@/db/client";
import type { TranslationKey } from "@/i18n/catalog";
import { useLanguage, useTranslation } from "@/i18n/context";
import { openInAppBrowser } from "@/lib/app-handoff";
import { useAuthSession } from "@/lib/auth-session";
import { legalUrl } from "@/lib/legal-url";
import { useColors } from "@/theme/use-colors";

const FEATURES = [
    { sends: "aiConsent.voiceSends", title: "aiConsent.voice" },
    { sends: "aiConsent.scanSends", title: "aiConsent.scan" },
    { sends: "aiConsent.planScanSends", title: "aiConsent.planScan" },
    { sends: "aiConsent.suggestionsSends", title: "aiConsent.suggestions" },
    { sends: "aiConsent.lookupSends", title: "aiConsent.lookup" },
] as const satisfies readonly { sends: TranslationKey; title: TranslationKey }[];

export function recordAiConsent(db: Database, allowed: boolean): void {
    saveAiConsent(db, allowed).catch((cause: unknown) => {
        console.error("Saving the AI consent failed", cause);
    });
}

export function AiConsentDetails() {
    const t = useTranslation();
    const { language } = useLanguage();
    return (
        <View>
            {FEATURES.map((feature, index) => (
                <View
                    className={cn("border-border border-t py-2.5", index === FEATURES.length - 1 && "border-b")}
                    key={feature.title}
                >
                    <Text className="text-body text-foreground">{t(feature.title)}</Text>
                    <Text className="text-footnote text-muted pt-0.5 leading-snug">{t(feature.sends)}</Text>
                </View>
            ))}
            <Text className="text-footnote text-muted pt-3 leading-snug">
                {t("aiConsent.fine")}{" "}
                <Text
                    accessibilityRole="link"
                    className="text-tint"
                    onPress={() => openInAppBrowser(legalUrl("privacy", language))}
                >
                    {t("aiConsent.privacy")}
                </Text>
            </Text>
        </View>
    );
}

function AiConsentPrompt({ onAnswer }: { onAnswer: (allowed: boolean) => void }) {
    const t = useTranslation();
    return (
        <View>
            <Text accessibilityRole="header" className="text-foreground font-sans-semibold text-title">
                {t("aiConsent.title")}
            </Text>
            <Text className="text-muted text-subtitle pt-1 pb-4 leading-snug">{t("aiConsent.lead")}</Text>
            <AiConsentDetails />
            <Button className="mt-5 rounded-full" fullWidth onPress={() => onAnswer(true)} size="md" variant="primary">
                {t("aiConsent.allow")}
            </Button>
            <Button className="mt-2.5 rounded-full" fullWidth onPress={() => onAnswer(false)} size="md" variant="ghost">
                {t("aiConsent.notNow")}
            </Button>
        </View>
    );
}

// Must come before either screen mounts: voice records on open, and both send once they have a clip or a photo.
export function AiConsentGate() {
    const db = useDatabase();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const consent = useAiConsent(db);
    const answer = (allowed: boolean) => {
        if (allowed || consent !== "allowed") {
            recordAiConsent(db, allowed);
        }
        if (!allowed) {
            router.back();
        }
    };
    return (
        <ScrollView
            className="bg-background flex-1"
            contentContainerClassName="px-5 pt-8"
            contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) }}
        >
            <AiConsentPrompt onAnswer={answer} />
        </ScrollView>
    );
}

// Waits for no cover, for the reason `UpdateSheet` does, and stays mounted once asked so an answer animates out.
export function AiConsentSheet() {
    const consent = useAiConsent(useDatabase());
    const [asked, setAsked] = useState(consent === "unanswered");
    if (consent === "unanswered" && !asked) {
        setAsked(true);
    }
    return asked ? <AiConsentSheetBody consent={consent} /> : null;
}

function AiConsentSheetBody({ consent }: { consent: AiConsent }) {
    const db = useDatabase();
    const colors = useColors();
    const insets = useSafeAreaInsets();
    const sheetInsets = useMemo(() => ({ ...insets, bottom: 0 }), [insets]);
    const { gate } = useAuthSession();
    const onTabs = useSegments()[0] === "(tabs)";
    const lockOpen = useAppLockOpen();
    const covered = useAuthCovered();

    const open = gate === "signed-in" && consent === "unanswered" && onTabs && lockOpen && !covered;

    return (
        <BottomSheet
            native
            nativeBackground={colors.background}
            onOpenChange={(next) => {
                // Only a swipe the person made is a Not now, not a close this render asked for (an answer, a lock).
                if (!next && open) {
                    recordAiConsent(db, false);
                }
            }}
            open={open}
        >
            <SafeAreaInsetsContext.Provider value={sheetInsets}>
                <BottomSheet.Content size="auto">
                    <AiConsentPrompt onAnswer={(allowed) => recordAiConsent(db, allowed)} />
                </BottomSheet.Content>
            </SafeAreaInsetsContext.Provider>
        </BottomSheet>
    );
}
