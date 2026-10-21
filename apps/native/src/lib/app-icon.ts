import { getAppIconName, setAlternateAppIcon, supportsAlternateIcons } from "expo-alternate-app-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";

import { appIconTransition } from "@/domain/app-icons";
import type { AppIconEvent, AppIconState } from "@/domain/app-icons";
import { translateNow } from "@/i18n/runtime";
import { notifyFailure } from "@/lib/notify";

export const alternateIconsSupported: boolean = supportsAlternateIcons;

/** iOS is the only record of which icon is on, so a setting can never disagree with the home screen. */
function readAppIconName(): string | null {
    try {
        return getAppIconName();
    } catch {
        return null;
    }
}

export interface AppIconControl {
    /** Null is the primary icon. */
    active: string | null;
    choose: (name: string | null) => void;
}

export function useAppIcon(): AppIconControl {
    const [state, setState] = useState<AppIconState>(() => ({
        active: readAppIconName(),
        pending: null,
    }));
    /** A ref because `choose` must read the in-flight request synchronously, which a queued updater cannot report. */
    const latest = useRef(state);

    const commit = useCallback((next: AppIconState) => {
        latest.current = next;
        setState(next);
    }, []);

    const apply = useCallback(
        (event: AppIconEvent): boolean => {
            const next = appIconTransition(latest.current, event);
            if (next === latest.current) {
                return false;
            }
            commit(next);
            return true;
        },
        [commit]
    );

    useFocusEffect(
        useCallback(() => {
            // Re-reading mid-flight would undo the optimistic tap for a frame.
            if (latest.current.pending === null) {
                commit({ active: readAppIconName(), pending: null });
            }
        }, [commit])
    );

    const choose = useCallback(
        (name: string | null) => {
            if (!apply({ kind: "tap", name })) {
                return;
            }
            setAlternateAppIcon(name)
                .then(() => {
                    apply({ kind: "resolved", name });
                })
                .catch((cause: unknown) => {
                    console.error("App icon change failed", cause);
                    apply({ kind: "rejected", reported: readAppIconName() });
                    notifyFailure({
                        body: translateNow("settings.appIcon.failedBody"),
                        title: translateNow("settings.appIcon.failedTitle"),
                    });
                });
        },
        [apply]
    );

    return { active: state.active, choose };
}
