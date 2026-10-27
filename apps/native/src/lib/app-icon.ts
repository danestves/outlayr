import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import { getAppIconName, setAlternateAppIcon, supportsAlternateIcons } from "expo-alternate-app-icons";
import { useFocusEffect } from "expo-router";
import { useRef, useState } from "react";

import { appIconTransition } from "@/domain/app-icons";
import type { AppIconEvent, AppIconState } from "@/domain/app-icons";
import { translateNow } from "@/i18n/runtime";
import { notifyFailure } from "@/lib/notify";
import { createCommand, SILENT } from "@/state/atom-command";
import { useAtomAction } from "@/state/use-atom-action";

const setAppIconCommand = createCommand({
    execute: (name: string | null) => Effect.tryPromise(() => setAlternateAppIcon(name)).pipe(Effect.as(name)),
    label: "app-icon:set",
});

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

    const commit = (next: AppIconState) => {
        latest.current = next;
        setState(next);
    };

    const apply = (event: AppIconEvent): boolean => {
        const next = appIconTransition(latest.current, event);
        if (next === latest.current) {
            return false;
        }
        commit(next);
        return true;
    };

    useFocusEffect(() => {
        // Re-reading mid-flight would undo the optimistic tap for a frame.
        if (latest.current.pending === null) {
            commit({ active: readAppIconName(), pending: null });
        }
    });

    const setIcon = useAtomAction(
        setAppIconCommand,
        {
            onFailure: (cause) => {
                console.error("App icon change failed", Cause.squash(cause));
                apply({ kind: "rejected", reported: readAppIconName() });
                notifyFailure({
                    body: translateNow("settings.appIcon.failedBody"),
                    title: translateNow("settings.appIcon.failedTitle"),
                });
            },
            onSuccess: (name) => {
                apply({ kind: "resolved", name });
            },
        },
        SILENT
    );

    const choose = (name: string | null) => {
        if (apply({ kind: "tap", name })) {
            setIcon(name);
        }
    };

    return { active: state.active, choose };
}
