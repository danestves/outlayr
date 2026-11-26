import type { PushRow } from "@outlayr/backend/confect/sync";
import { api } from "@outlayr/backend/convex/_generated/api";
import type { DbClient } from "@tanstack/react-db";
import type { FunctionArgs, FunctionReturnType } from "convex/server";

import { PROFILE, PUSHER } from "./db-keys";

type PushRef = typeof api.sync.push;

export interface LedgerPusher {
    mutation: (mutation: PushRef, args: FunctionArgs<PushRef>) => Promise<FunctionReturnType<PushRef>>;
}

export { PUSHER } from "./db-keys";

const BATCH = 100;
const DEVICE_KEY = "outlayr-device-id";

let fallbackDevice: string | undefined;

export function profileOf(db: DbClient) {
    return db.getDependency<string | null>(PROFILE) ?? null;
}

export function webDeviceId() {
    try {
        const stored = localStorage.getItem(DEVICE_KEY);
        if (stored) {
            return stored;
        }
        const minted = `web-${crypto.randomUUID()}`;
        localStorage.setItem(DEVICE_KEY, minted);
        return minted;
    } catch {
        fallbackDevice ??= `web-${crypto.randomUUID()}`;
        return fallbackDevice;
    }
}

export async function pushRows(db: DbClient, rows: readonly PushRow[], onPushed?: (count: number) => void) {
    const pusher = db.requireDependency<LedgerPusher>(PUSHER);
    const deviceId = webDeviceId();
    const profileId = profileOf(db);
    let pushedSeq = 0;
    for (let start = 0; start < rows.length; start += BATCH) {
        const batch = rows.slice(start, start + BATCH);
        const args: FunctionArgs<PushRef> =
            profileId === null ? { deviceId, rows: batch } : { deviceId, profileId, rows: batch };
        // oxlint-disable-next-line no-await-in-loop -- the server hands out seq in push order, so batches go one at a time.
        const { nextSeq } = await pusher.mutation(api.sync.push, args);
        pushedSeq = nextSeq - 1;
        onPushed?.(Math.min(start + BATCH, rows.length));
    }
    return pushedSeq;
}
