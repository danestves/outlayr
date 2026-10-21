import { useSegments } from "expo-router";
import { checkForUpdateAsync, fetchUpdateAsync, isEnabled, reloadAsync, useUpdates } from "expo-updates";
import { BottomSheet } from "panelui-native/components/bottom-sheet";
import { Button } from "panelui-native/components/button";
import { cn } from "panelui-native/utils/cn";
import { useEffect, useMemo, useState } from "react";
import { AppState, View } from "react-native";
import { SafeAreaInsetsContext, useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppLockOpen } from "@/components/app-lock-gate";
import { useAuthCovered } from "@/components/auth-cover";
import { MonoLabel } from "@/components/mono-label";
import { Text } from "@/components/text";
import { useFlushDeferredDeletes } from "@/data/use-deferred-delete";
import { describeUpdate } from "@/domain/app-update";
import { formatChargeDate } from "@/domain/dates";
import { useLanguage, useTranslation } from "@/i18n/context";
import { APP_VERSION } from "@/lib/app-version";
import { useColors } from "@/theme/use-colors";

const CHECKS_UPDATES = isEnabled && !__DEV__;

// Waits for the tabs with no cover up: UIKit drops a sheet asked for over a modal route, and one over the lock screen
// blocks Unlock.
export function UpdateSheet() {
    const t = useTranslation();
    const { language } = useLanguage();
    const colors = useColors();
    const insets = useSafeAreaInsets();
    const sheetInsets = useMemo(() => ({ ...insets, bottom: 0 }), [insets]);
    const { availableUpdate, downloadedUpdate } = useUpdates();
    const update = describeUpdate(availableUpdate);
    const onTabs = useSegments()[0] === "(tabs)";
    const lockOpen = useAppLockOpen();
    const covered = useAuthCovered();
    const flushDeletes = useFlushDeferredDeletes();
    const [dismissedId, setDismissedId] = useState<string | null>(null);
    const [state, setState] = useState<"idle" | "busy" | "failed">("idle");
    const busy = state === "busy";

    const [shown, setShown] = useState(update);
    if (update && update.id !== shown?.id) {
        setShown(update);
    }

    useEffect(() => {
        if (!CHECKS_UPDATES) {
            return;
        }
        let phase = AppState.currentState;
        const subscription = AppState.addEventListener("change", (next) => {
            const returned = phase === "background" && next === "active";
            phase = next;
            if (!returned) {
                return;
            }
            setDismissedId(null);
            setState((current) => (current === "failed" ? "idle" : current));
            checkForUpdateAsync().catch((error) => {
                console.warn("[outlayr] update check failed", error);
            });
        });
        return () => subscription.remove();
    }, []);

    if (!shown) {
        return null;
    }

    const dismiss = () => {
        setDismissedId(shown.id);
        setState((current) => (current === "failed" ? "idle" : current));
    };

    const apply = async () => {
        const downloaded = downloadedUpdate?.updateId === shown.id;
        setState("busy");
        try {
            if (!downloaded) {
                await fetchUpdateAsync();
            }
            await flushDeletes();
            await reloadAsync();
        } catch (error) {
            console.warn("[outlayr] update failed", error);
            setState("failed");
        }
    };

    const open = update !== null && update.id !== dismissedId && onTabs && lockOpen && !covered;

    return (
        <BottomSheet
            native
            nativeBackground={colors.background}
            onOpenChange={(next) => {
                if (!next) {
                    dismiss();
                }
            }}
            open={open}
        >
            <SafeAreaInsetsContext.Provider value={sheetInsets}>
                <BottomSheet.Content size="auto">
                    <View className="gap-1 pb-4">
                        <Text accessibilityRole="header" className="text-foreground font-sans-semibold text-title">
                            {t("update.title")}
                        </Text>
                        <MonoLabel>
                            {t("update.meta", {
                                date: formatChargeDate(shown.at, undefined, language),
                                version: APP_VERSION,
                            })}
                        </MonoLabel>
                    </View>
                    <View className="pb-5">
                        {shown.notes.map((note, index) => (
                            <Text
                                className={cn(
                                    "border-border text-body text-foreground border-t py-2.5 leading-snug",
                                    index === shown.notes.length - 1 && "border-b"
                                )}
                                key={note}
                            >
                                {note}
                            </Text>
                        ))}
                    </View>
                    {state === "failed" ? (
                        <Text className="text-danger text-subtitle pb-3">{t("update.failed")}</Text>
                    ) : null}
                    <Button
                        className="rounded-full"
                        disabled={busy}
                        fullWidth
                        onPress={apply}
                        size="md"
                        variant="primary"
                    >
                        {t(busy ? "update.updating" : "update.now")}
                    </Button>
                    {busy ? null : (
                        <Button className="mt-2.5 rounded-full" fullWidth onPress={dismiss} size="md" variant="ghost">
                            {t("update.later")}
                        </Button>
                    )}
                </BottomSheet.Content>
            </SafeAreaInsetsContext.Provider>
        </BottomSheet>
    );
}
