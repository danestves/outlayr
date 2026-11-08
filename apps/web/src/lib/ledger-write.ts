import type { PushRow } from "@outlayr/backend/confect/sync";
import { api } from "@outlayr/backend/convex/_generated/api";
import type { DbClient } from "@tanstack/react-db";
import type { FunctionArgs, FunctionReturnType } from "convex/server";

type PushRef = typeof api.sync.push;

export interface LedgerPusher {
    mutation: (mutation: PushRef, args: FunctionArgs<PushRef>) => Promise<FunctionReturnType<PushRef>>;
}

export const PUSHER = "pusher";

const BATCH = 100;
const DEVICE_KEY = "outlayr-device-id";

let fallbackDevice: string | undefined;

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

export async function pushRows(db: DbClient, rows: readonly PushRow[]) {
    const pusher = db.requireDependency<LedgerPusher>(PUSHER);
    const deviceId = webDeviceId();
    for (let start = 0; start < rows.length; start += BATCH) {
        // oxlint-disable-next-line no-await-in-loop -- the server hands out seq in push order, so batches go one at a time.
        await pusher.mutation(api.sync.push, { deviceId, rows: rows.slice(start, start + BATCH) });
    }
}
