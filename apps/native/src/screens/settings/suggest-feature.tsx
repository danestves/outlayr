import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppSymbol } from "@/components/app-symbol";
import { InlineFailure } from "@/components/form/inline-failure";
import { StepCta } from "@/components/import-sheet/step-cta";
import { ToggleRow } from "@/components/list/list-row";
import { MonoLabel } from "@/components/mono-label";
import { revealEntering } from "@/components/sentence/sentence-motion";
import { Text, TextInput } from "@/components/text";
import { cn } from "@/components/tw";
import { useAppSettings } from "@/contexts/display-settings-context";
import { newId } from "@/domain/ids";
import { useLongWait } from "@/hooks/use-long-wait";
import { useLanguage, useTranslation } from "@/i18n/context";
import { APP_VERSION } from "@/lib/app-version";
import { useAuthSession } from "@/lib/auth-session";
import { useHaptics } from "@/lib/use-haptics";
import { SILENT } from "@/state/atom-command";
import { submitFeatureRequestCommand } from "@/state/cloud-commands";
import { useAtomAction } from "@/state/use-atom-action";
import { useColors } from "@/theme/use-colors";

const MAX_TEXT = 1000;

export function SuggestFeature() {
    const t = useTranslation();
    const { language } = useLanguage();
    const { profile } = useAuthSession();
    const { state: settings } = useAppSettings();
    const haptics = useHaptics();
    const colors = useColors();
    const insets = useSafeAreaInsets();
    const [wish, setWish] = useState("");
    const [reason, setReason] = useState("");
    const [notify, setNotify] = useState(false);
    const [busy, setBusy] = useState(false);
    const [failure, setFailure] = useState<string | null>(null);
    const [sent, setSent] = useState(false);
    const [submissionId] = useState(newId);
    const slow = useLongWait(busy);

    const fail = (message: string) => {
        haptics("error");
        setFailure(message);
    };
    const submit = useAtomAction(
        submitFeatureRequestCommand,
        {
            onFailure: () => fail(t("settings.suggest.failed")),
            onSettled: () => setBusy(false),
            onSuccess: (status) => {
                if (status === "ok") {
                    haptics("success");
                    setSent(true);
                } else {
                    fail(t(status === "rateLimited" ? "settings.suggest.rateLimited" : "settings.suggest.failed"));
                }
            },
        },
        SILENT
    );

    const send = () => {
        setFailure(null);
        setBusy(true);
        submit({
            appVersion: APP_VERSION,
            linkAccount: settings.bool("shareAnalytics"),
            locale: language,
            notify: notify && profile !== null,
            osName: Platform.select({ android: "Android", ios: "iOS" }) ?? Platform.OS,
            osVersion: String(Platform.Version),
            reason,
            submissionId,
            wish,
        });
    };

    const sentence = [
        t("settings.suggest.wish"),
        wish.trim(),
        ...(reason.trim() ? [t("settings.suggest.reason"), reason.trim()] : []),
    ].join(" ");

    return (
        <KeyboardAvoidingView
            behavior="padding"
            className="flex-1"
            enabled={Platform.OS === "android"}
            keyboardVerticalOffset={insets.top}
        >
            <ScrollView
                automaticallyAdjustKeyboardInsets
                className="ios:bg-background flex-1"
                contentContainerClassName="gap-6 px-5 pt-8 pb-10"
                keyboardShouldPersistTaps="handled"
            >
                <MonoLabel accessibilityRole="header">{t("settings.row.suggest")}</MonoLabel>
                {sent ? (
                    <Animated.View className="gap-3" entering={revealEntering()}>
                        <View className="flex-row items-center gap-2">
                            <AppSymbol
                                name="checkmark.circle.fill"
                                size={20}
                                tintColor={colors.income}
                                type="monochrome"
                            />
                            <Text className="text-foreground text-title font-sans-semibold">
                                {t("settings.suggest.sent")}
                            </Text>
                        </View>
                        <Text className="text-muted text-body">{t("settings.suggest.echo", { sentence })}</Text>
                        <StepCta className="mt-4" label={t("common.done")} onPress={() => router.back()} />
                    </Animated.View>
                ) : (
                    <>
                        <SentenceField
                            autoFocus
                            editable={!busy}
                            onChangeText={setWish}
                            prompt={t("settings.suggest.wish")}
                            value={wish}
                        />
                        <SentenceField
                            editable={!busy}
                            onChangeText={setReason}
                            prompt={t("settings.suggest.reason")}
                            value={reason}
                        />
                        {profile ? (
                            <ToggleRow
                                detail={profile.email}
                                icon="Mail01"
                                onValueChange={setNotify}
                                title={t("settings.suggest.notify")}
                                value={notify}
                            />
                        ) : null}
                        <View>
                            <Text className="text-muted text-footnote">{t("settings.suggest.privacy")}</Text>
                        </View>
                        <View>
                            <InlineFailure message={failure} />
                            <StepCta
                                busy={busy}
                                busyLabel={slow ? t("settings.suggest.sending") : undefined}
                                disabled={wish.trim() === ""}
                                label={t("settings.suggest.send")}
                                onPress={send}
                            />
                        </View>
                    </>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

function SentenceField({
    prompt,
    value,
    onChangeText,
    autoFocus = false,
    editable,
}: {
    prompt: string;
    value: string;
    onChangeText: (value: string) => void;
    autoFocus?: boolean;
    editable: boolean;
}) {
    const colors = useColors();
    const [focused, setFocused] = useState(false);
    return (
        <View className={cn("gap-1 border-b pb-2", focused ? "border-tint" : "border-border")}>
            <Text className="text-muted text-title">{prompt}</Text>
            <TextInput
                accessibilityLabel={prompt}
                autoFocus={autoFocus}
                className="text-foreground text-title font-sans-medium p-0"
                editable={editable}
                maxLength={MAX_TEXT}
                multiline
                onBlur={() => setFocused(false)}
                onChangeText={onChangeText}
                onFocus={() => setFocused(true)}
                scrollEnabled={false}
                selectionColor={colors.tint}
                value={value}
            />
        </View>
    );
}
