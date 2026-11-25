import { useSyncExternalStore } from "react";

import type { InviteLink } from "./deep-links";

let pending: InviteLink | null = null;

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

const current = () => pending;

export function holdInviteLink(invite: InviteLink | null): void {
    pending = invite;
    for (const listener of listeners) {
        listener();
    }
}

export function takeInviteLink(): InviteLink | null {
    const invite = pending;
    if (invite !== null) {
        holdInviteLink(null);
    }
    return invite;
}

export function usePendingInviteLink(): InviteLink | null {
    return useSyncExternalStore(subscribe, current, current);
}
