import SquareLock02Icon from "@hugeicons-pro/core-solid-rounded/SquareLock02Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { createContext, use, useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

import { Text } from "@/components/text";
import { useSettingBool } from "@/contexts/display-settings-context";
import { lockFailureMessage, lockGate, lockIsUnenforceable } from "@/domain/app-lock";
import type { TranslationKey } from "@/i18n/catalog";
import { useTranslation } from "@/i18n/context";
import { lockIsEnforceable, requestUnlock } from "@/lib/app-lock";
import { useRelock } from "@/lib/use-relock";
import { useColors } from "@/theme/use-colors";

const LockOpenContext = createContext(true);

export function useAppLockOpen(): boolean {
    return use(LockOpenContext);
}

// Holds the shield over `children` rather than unmounting them, which would discard the navigation stack.
export function AppLockGate({ children }: { children: ReactNode }) {
    const t = useTranslation();
    const enabled = useSettingBool("biometricLock");
    const [unlocked, setUnlocked] = useState(false);
    const [enforceable, setEnforceable] = useState<boolean | null>(null);
    const [failure, setFailure] = useState<TranslationKey | null>(null);
    const [checking, setChecking] = useState(false);

    // Seeded from the mount-time setting, so a launch with the lock on is not mistaken for turning it on.
    const [armed, setArmed] = useState(enabled);
    if (enabled !== armed) {
        setArmed(enabled);
        // The Settings toggle only flips on behind a passed check, so prompting here would be a second prompt.
        setUnlocked(enabled);
        if (!enabled) {
            setEnforceable(null);
            setFailure(null);
        }
    }

    useEffect(() => {
        if (!enabled) {
            return;
        }
        let cancelled = false;
        lockIsEnforceable().then((ok) => {
            if (!cancelled) {
                setEnforceable(ok);
            }
        });
        return () => {
            cancelled = true;
        };
    }, [enabled]);

    const relock = useCallback(() => setUnlocked(false), []);
    useRelock(relock);

    const attempt = useCallback(async () => {
        setChecking(true);
        const result = await requestUnlock(t("transaction.lock.prompt"));
        setChecking(false);
        if (result.success) {
            setFailure(null);
            setUnlocked(true);
            return;
        }
        if (lockIsUnenforceable(result.error)) {
            setEnforceable(false);
            return;
        }
        setFailure(lockFailureMessage(result.error));
    }, [t]);

    const gate = lockGate(enabled, unlocked, enforceable);

    // One automatic prompt per shut gate: re-prompting would reopen a sheet the user just dismissed.
    const prompted = useRef(false);
    useEffect(() => {
        if (gate === "open") {
            prompted.current = false;
            return;
        }
        if (enforceable !== true || prompted.current) {
            return;
        }
        prompted.current = true;
        // oxlint-disable-next-line no-void -- the prompt is deliberately not awaited, and requestUnlock (lib/app-lock.ts:21-31) resolves a result object for every failure, so there is no rejection a .catch could handle
        void attempt();
    }, [gate, enforceable, attempt]);

    return (
        <View className="flex-1">
            <LockOpenContext.Provider value={gate === "open"}>{children}</LockOpenContext.Provider>
            {gate === "shut" ? (
                <AppLockScreen
                    busy={checking}
                    message={failure ? t(failure) : null}
                    onUnlock={() => {
                        // oxlint-disable-next-line no-void -- the prompt is deliberately not awaited, and requestUnlock (lib/app-lock.ts:21-31) resolves a result object for every failure, so there is no rejection a .catch could handle
                        void attempt();
                    }}
                />
            ) : null}
        </View>
    );
}

function AppLockScreen({ busy, message, onUnlock }: { busy: boolean; message: string | null; onUnlock: () => void }) {
    const colors = useColors();
    const t = useTranslation();

    return (
        <View className="bg-background absolute inset-0 items-center justify-center gap-4 px-8">
            <HugeiconsIcon color={colors.subtle} icon={SquareLock02Icon} size={56} />
            <Text className="font-sans-semibold text-foreground text-title">{t("transaction.lock.title")}</Text>

            <Pressable
                accessibilityRole="button"
                className="bg-accent rounded-xl px-6 py-3 active:opacity-80 disabled:opacity-50"
                disabled={busy}
                onPress={onUnlock}
            >
                <Text className="font-sans-semibold text-accent-foreground text-body">
                    {t(busy ? "transaction.lock.checking" : "transaction.lock.unlock")}
                </Text>
            </Pressable>

            {message ? <Text className="text-label text-muted text-center">{message}</Text> : null}
        </View>
    );
}
