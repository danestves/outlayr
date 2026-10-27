import { useAtomValue } from "@effect/atom-react/Hooks";
import SquareLock02Icon from "@hugeicons-pro/core-solid-rounded/SquareLock02Icon";
import { HugeiconsIcon } from "@hugeicons/react-native";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import { createContext, use, useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { AppState, Pressable, View } from "react-native";

import { Text } from "@/components/text";
import { useSettingBool } from "@/contexts/display-settings-context";
import { lockFailureMessage, lockGate, lockIsUnenforceable } from "@/domain/app-lock";
import type { TranslationKey } from "@/i18n/catalog";
import { useTranslation } from "@/i18n/context";
import { lockEnforceableAtom } from "@/lib/app-lock-enforceable";
import { subscribeAppState } from "@/lib/app-state";
import { useRelock } from "@/lib/use-relock";
import { SILENT } from "@/state/atom-command";
import { requestUnlockCommand } from "@/state/cloud-commands";
import { useAtomAction } from "@/state/use-atom-action";
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
    const [unenforceable, setUnenforceable] = useState(false);
    const [failure, setFailure] = useState<TranslationKey | null>(null);
    const [checking, setChecking] = useState(false);

    // Seeded from the mount-time setting, so a launch with the lock on is not mistaken for turning it on.
    const [armed, setArmed] = useState(enabled);
    if (enabled !== armed) {
        setArmed(enabled);
        // The Settings toggle only flips on behind a passed check, so prompting here would be a second prompt.
        setUnlocked(enabled);
        if (!enabled) {
            setUnenforceable(false);
            setFailure(null);
        }
    }

    const probe = useAtomValue(lockEnforceableAtom(enabled));
    const probed = AsyncResult.isSuccess(probe) ? probe.value : null;
    const enforceable = unenforceable ? false : probed;

    useRelock(() => setUnlocked(false));

    const unlock = useAtomAction(
        requestUnlockCommand,
        {
            onSettled: () => setChecking(false),
            onSuccess: (result) => {
                if (result.success) {
                    setFailure(null);
                    setUnlocked(true);
                    return;
                }
                if (lockIsUnenforceable(result.error)) {
                    setUnenforceable(true);
                    return;
                }
                setFailure(lockFailureMessage(result.error));
            },
        },
        SILENT
    );
    const attempt = () => {
        setChecking(true);
        unlock(t("transaction.lock.prompt"));
    };

    const gate = lockGate(enabled, unlocked, enforceable);

    // One automatic prompt per shut gate: re-prompting would reopen a sheet the user just dismissed.
    const prompted = useRef(false);
    const promptUnlock = useEffectEvent(attempt);
    // oxlint-disable-next-line outlayr/react-effect-budget -- opens the system biometric prompt once each time the gate shuts
    useEffect(() => {
        if (gate === "open") {
            prompted.current = false;
            return;
        }
        if (enforceable !== true || prompted.current) {
            return;
        }
        prompted.current = true;
        promptUnlock();
    }, [gate, enforceable]);

    return (
        <View className="flex-1">
            <LockOpenContext.Provider value={gate === "open"}>{children}</LockOpenContext.Provider>
            {gate === "shut" ? (
                <AppLockScreen busy={checking} message={failure ? t(failure) : null} onUnlock={attempt} />
            ) : null}
            {gate === "open" && enabled && enforceable === true ? <SwitcherShield /> : null}
        </View>
    );
}

const outOfFront = (phase: typeof AppState.currentState) => phase === "inactive" || phase === "background";

// iOS snapshots the app-switcher card during `inactive`, before a `background` relock could render.
function SwitcherShield() {
    const colors = useColors();
    const covering = useSyncExternalStore(subscribeAppState, () => outOfFront(AppState.currentState));

    if (!covering) {
        return null;
    }
    return (
        <View className="bg-background absolute inset-0 items-center justify-center">
            <HugeiconsIcon color={colors.subtle} icon={SquareLock02Icon} size={56} />
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
